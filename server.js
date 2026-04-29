require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Resend } = require("resend");
const mongoose = require("mongoose");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ===== ENV =====
const resend = new Resend(process.env.RESEND_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== HEALTH =====
app.get("/", (req, res) => {
  res.send("CraftNova Backend Live 🚀");
});

// ===== DATABASE =====
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.once("open", () => {
  console.log("✅ Connected to MongoDB");
});

// ===== MODELS =====
const Lead = mongoose.model("Lead", {
  name: String,
  email: String,
  business: String,
  industry: String,
  facebook: String,
  instagram: String,
  linkedin: String,
  goal: String,
  createdAt: { type: Date, default: Date.now }
});

const Output = mongoose.model("Output", {
  content: String,
  score: String,
  createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model("Job", {
  type: String,
  payload: Object,
  runAt: Date,
  status: { type: String, default: "pending" },
  attempts: { type: Number, default: 0 },
  lastError: String,
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", {
  name: String,
  email: String,
  business: String,
  date: String,
  time: String,
  status: { type: String, default: "scheduled" },
  createdAt: { type: Date, default: Date.now }
});

// ===== FOLLOW-UP QUEUE =====
function enqueueFollowUps(lead) {
  const now = Date.now();

  const jobs = [
    { step: 1, delay: 24 * 60 * 60 * 1000 },
    { step: 2, delay: 3 * 24 * 60 * 60 * 1000 },
    { step: 3, delay: 5 * 24 * 60 * 60 * 1000 }
  ];

  jobs.forEach(j => {
    Job.create({
      type: "followup",
      payload: {
        name: lead.name,
        email: lead.email,
        business: lead.business,
        step: j.step
      },
      runAt: new Date(now + j.delay)
    });
  });
}

// ===== WORKER =====
async function processJobs() {
  try {
    const jobs = await Job.find({
      status: "pending",
      runAt: { $lte: new Date() }
    }).limit(5);

    for (const job of jobs) {
      try {
        job.status = "processing";
        await job.save();

        const { name, email, business, step } = job.payload;

        let subject = "";
        let text = "";

        if (step === 1) {
          subject = "Quick follow-up on your audit";
          text = `Hi ${name},

Did you review your audit for ${business}?

— CraftNova AI  
by Craftroots Technologies`;
        }

        if (step === 2) {
          subject = `How businesses like ${business} grow faster`;
          text = `Hi ${name},

Businesses like yours typically grow 2–3x after improving strategy.

— CraftNova AI  
by Craftroots Technologies`;
        }

        if (step === 3) {
          subject = "Let’s improve your marketing results";
          text = `Hi ${name},

We can implement your full strategy and drive results.

Book a strategy call:
https://craftrootstech.com/book

— CraftNova AI  
by Craftroots Technologies`;
        }

        await resend.emails.send({
          from: "noreply@craftrootstech.com",
          to: email,
          subject,
          text
        });

        job.status = "done";
        await job.save();

      } catch (err) {
        job.attempts += 1;
        job.lastError = err.message;

        if (job.attempts < 3) {
          job.status = "pending";
          job.runAt = new Date(Date.now() + 60000);
        } else {
          job.status = "failed";
        }

        await job.save();
      }
    }
  } catch (err) {
    console.error("Worker error:", err.message);
  }
}

setInterval(processJobs, 10000);

// ===== LEAD ROUTE =====
app.post("/lead", async (req, res) => {
  const { name, email, business, industry, facebook, instagram, linkedin, goal } = req.body;

  try {
    const lead = await Lead.create({
      name,
      email,
      business,
      industry,
      facebook,
      instagram,
      linkedin,
      goal
    });

    const prompt = `
Return EXACT format:

OVERALL SCORE: (0-100)

SUMMARY:
...

PLATFORM ANALYSIS:
Instagram:
Facebook:
LinkedIn:

KEY PROBLEMS:
- ...

STRATEGY:
- ...

ACTION PLAN:
1. ...

Business: ${business}
Industry: ${industry || "Not specified"}
Goal: ${goal || "Not specified"}
`;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const raw = ai.choices[0].message.content;
    const scoreMatch = raw.match(/OVERALL SCORE:\s*(\d{1,3})/i);
    const score = scoreMatch ? scoreMatch[1] : "N/A";

    await Output.create({ content: raw, score });

    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: `Your AI Marketing Audit for ${business}`,
      text: `Hi ${name},

${raw}

📊 Score: ${score}/100

Book a strategy session:
https://craftrootstech.com/book

— CraftNova AI  
by Craftroots Technologies`
    });

    enqueueFollowUps(lead);

    res.json({ success: true, score });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== BOOKING ROUTES =====
app.post("/book", async (req, res) => {
  const { name, email, business, date, time } = req.body;

  try {
    const exists = await Booking.findOne({ date, time });
    if (exists) return res.status(400).json({ error: "Slot taken" });

    const booking = await Booking.create({
      name,
      email,
      business,
      date,
      time
    });

    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: "Booking Confirmed",
      text: `Hi ${name},

Your session is booked.

Date: ${date}
Time: ${time}

— CraftNova AI  
by Craftroots Technologies`
    });

    res.json({ success: true, booking });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/bookings", async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 });
  res.json(bookings);
});

// ===== SERVER =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("🚀 CraftNova running on port " + PORT);
});