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

// ===== MIDDLEWARE =====
app.use(cors());
app.use(bodyParser.json());

// ===== ENV =====
const JWT_SECRET = process.env.JWT_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.send("CraftNova Backend is Running 🚀");
});

// ===== DATABASE =====
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.once("open", () => {
  console.log("✅ Connected to MongoDB");
});

// ===== SCHEMAS =====
const User = mongoose.model("User", {
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

const Output = mongoose.model("Output", {
  content: String,
  agent: String,
  score: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model("Lead", {
  name: String,
  email: String,
  business: String,
  industry: String,
  facebook: String,
  instagram: String,
  linkedin: String,
  goal: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

// ===== FOLLOW-UP SYSTEM =====
function scheduleFollowUps(lead) {
  const { name, email, business } = lead;

  // ⚠️ For testing → use seconds instead of days
  const DAY = 1000 * 10; // 10 sec (change to 24*60*60*1000 in production)

  // Day 1
  setTimeout(async () => {
    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: `Quick follow-up on your audit`,
      text: `Hi ${name},

Did you get a chance to review your audit for ${business}?

Most businesses we analyze are missing key opportunities that increase leads significantly.

— CraftNova AI  
by Craftroots Technologies`
    });
  }, DAY);

  // Day 3
  setTimeout(async () => {
    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: `How businesses like ${business} grow faster`,
      text: `Hi ${name},

Businesses similar to ${business} typically increase engagement 2–3x after improving messaging and consistency.

We can help implement this for you.

— CraftNova AI  
by Craftroots Technologies`
    });
  }, DAY * 2);

  // Day 5
  setTimeout(async () => {
    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: `Let’s improve your marketing results`,
      text: `Hi ${name},

If you're serious about improving results, we can implement your full strategy.

Reply to this email or request a strategy session.

— CraftNova AI  
by Craftroots Technologies`
    });
  }, DAY * 3);
}

// ===== AUTH =====
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ===== LEAD + GPT =====
app.post("/lead", async (req, res) => {
  const {
    name,
    email,
    business,
    industry,
    facebook,
    instagram,
    linkedin,
    goal
  } = req.body;

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

    // ===== GPT =====
    const prompt = `
You are an elite digital marketing consultant.

Return STRICTLY this format:

OVERALL SCORE: number (0-100)

SUMMARY:
...

PLATFORM ANALYSIS:
Instagram:
Facebook:
LinkedIn:

KEY PROBLEMS:
- ...
- ...

STRATEGY:
- ...
- ...

ACTION PLAN:
1. ...
2. ...

Business: ${business}
Industry: ${industry || "Not specified"}
Goal: ${goal || "Not specified"}

Instagram: ${instagram || "None"}
Facebook: ${facebook || "None"}
LinkedIn: ${linkedin || "None"}
`;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a world-class marketing strategist." },
        { role: "user", content: prompt }
      ]
    });

    const raw = ai.choices[0].message.content;

    const scoreMatch = raw.match(/OVERALL SCORE:\s*(\d{1,3})/i);
    const score = scoreMatch ? scoreMatch[1] : "N/A";

    await Output.create({
      content: raw,
      agent: "intelligence",
      score,
      userId: null
    });

    // ===== EMAIL =====
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

    // 🔥 TRIGGER FOLLOW-UP SYSTEM
    scheduleFollowUps(lead);

    res.json({ status: "Success", score });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===== SERVER =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CraftNova running on port ${PORT}`);
});