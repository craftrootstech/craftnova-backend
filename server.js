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

// ===== HEALTH CHECK =====
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

// ===== ENQUEUE FOLLOW-UPS =====
function enqueueFollowUps(lead) {
  const now = Date.now();

  const jobs = [
    { step: 1, delay: 24 * 60 * 60 * 1000 }, // Day 1
    { step: 2, delay: 3 * 24 * 60 * 60 * 1000 }, // Day 3
    { step: 3, delay: 5 * 24 * 60 * 60 * 1000 }  // Day 5
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
        // LOCK JOB
        job.status = "processing";
        await job.save();

        const { name, email, business, step } = job.payload;

        let subject = "";
        let text = "";

        if (step === 1) {
          subject = "Quick follow-up on your audit";
          text = `Hi ${name},

Did you get a chance to review your audit for ${business}?

Most businesses we analyze are missing key opportunities that significantly increase leads.

— CraftNova AI  
by Craftroots Technologies`;
        }

        if (step === 2) {
          subject = `How businesses like ${business} grow faster`;
          text = `Hi ${name},

Businesses similar to ${business} typically increase engagement by 2–3x after improving their content and positioning.

We can help you implement this.

— CraftNova AI  
by Craftroots Technologies`;
        }

        if (step === 3) {
          subject = "Let’s improve your marketing results";
          text = `Hi ${name},

If you're serious about improving results, we can implement your full strategy.

Reply to this email to get started.

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

        // RETRY up to 3 times
        if (job.attempts < 3) {
          job.status = "pending";
          job.runAt = new Date(Date.now() + 60000); // retry in 1 min
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

// Run worker every 10 sec
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
You are an elite digital marketing consultant.

Return EXACT format:

OVERALL SCORE: (0-100)

SUMMARY:
(2-3 sentences)

PLATFORM ANALYSIS:
Instagram:
Facebook:
LinkedIn:

KEY PROBLEMS:
- point
- point

STRATEGY:
- point
- point

ACTION PLAN:
1. step
2. step

Business: ${business}
Industry: ${industry || "Not specified"}
Goal: ${goal || "Not specified"}
`;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a world-class marketing strategist." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
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

Here is your AI Marketing Audit:

${raw}

📊 Your Marketing Score: ${score}/100

⚠️ Businesses below 60% lose up to 70% of potential customers.

👉 Want us to implement this for you?
Reply to this email.

— CraftNova AI  
by Craftroots Technologies`
    });

    enqueueFollowUps(lead);

    res.json({ success: true, score });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== SERVER =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("🚀 CraftNova running on port " + PORT);
});