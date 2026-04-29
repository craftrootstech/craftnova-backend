require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Resend } = require("resend");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// ===== ENV =====
const resend = new Resend(process.env.RESEND_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

// ===== JOB QUEUE =====
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
    { step: 1, delay: 10000 }, // 10 sec (testing)
    { step: 2, delay: 20000 },
    { step: 3, delay: 30000 }
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

Most businesses miss key growth opportunities.

— CraftNova AI  
by Craftroots Technologies`;
      }

      if (step === 2) {
        subject = `How businesses like ${business} grow faster`;
        text = `Hi ${name},

Businesses like yours typically increase engagement 2–3x after improving messaging.

We can help implement this.

— CraftNova AI  
by Craftroots Technologies`;
      }

      if (step === 3) {
        subject = "Let’s improve your marketing results";
        text = `Hi ${name},

We can implement your strategy and drive results.

Reply to get started.

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
      job.status = "failed";
      job.attempts += 1;
      job.lastError = err.message;
      await job.save();
    }
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
Return EXACT format:

OVERALL SCORE: number

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
      subject: `Your AI Marketing Audit`,
      text: `Hi ${name},

${raw}

📊 Score: ${score}/100

— CraftNova AI  
by Craftroots Technologies`
    });

    // 🔥 persistent follow-ups
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