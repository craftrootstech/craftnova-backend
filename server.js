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

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB error:", err.message);
});

db.once("open", () => {
  console.log("✅ Connected to MongoDB");
});

// ===== SCHEMAS =====
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
});

const OutputSchema = new mongoose.Schema({
  content: String,
  agent: String,
  score: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
});

const LeadSchema = new mongoose.Schema({
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

// ===== MODELS =====
const User = mongoose.model("User", UserSchema);
const Output = mongoose.model("Output", OutputSchema);
const Lead = mongoose.model("Lead", LeadSchema);

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

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed });
    res.json({ status: "User created" });
  } catch {
    res.status(400).json({ error: "User exists" });
  }
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 🚀 LEAD + GPT INTELLIGENCE + OUTREACH =====
app.post("/lead", async (req, res) => {
  const {
    name,
    email,
    business,
    industry,
    facebook,
    instagram,
    linkedin,
    goal,
    message
  } = req.body;

  try {
    // SAVE LEAD
    const lead = await Lead.create({
      name,
      email,
      business,
      industry,
      facebook,
      instagram,
      linkedin,
      goal,
      message
    });

    // ===== GPT PROMPT =====
    const prompt = `
You are an elite digital marketing consultant.

Analyze the business and return a structured audit in this EXACT format:

OVERALL SCORE: (number from 0-100)

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

Platforms:
Instagram: ${instagram || "None"}
Facebook: ${facebook || "None"}
LinkedIn: ${linkedin || "None"}
`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a world-class marketing strategist." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const raw = aiResponse.choices[0].message.content;

    // ===== SCORE EXTRACTION =====
    const scoreMatch = raw.match(/OVERALL SCORE:\s*(\d{1,3})/i);
    const score = scoreMatch ? scoreMatch[1] : "N/A";

    // ===== SAVE OUTPUT =====
    await Output.create({
      content: raw,
      agent: "intelligence",
      score: score,
      userId: null
    });

    // ===== EMAIL =====
    const aiOutput = `
Hi ${name},

Here is your AI Marketing Audit for ${business}:

${raw}

📊 Your Marketing Score: ${score}/100

⚠️ Businesses below 60% typically lose over 70% of potential leads.

👉 Want us to implement this for you?
Reply to this email or book a strategy call.

— CraftNova AI System
`;

    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: `Your AI Marketing Audit for ${business}`,
      text: aiOutput
    });

    res.json({
      status: "Lead + GPT Intelligence + Email complete",
      leadId: lead._id,
      score
    });

  } catch (err) {
    console.error("LEAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== SEND EMAIL =====
app.post("/send-email", authMiddleware, async (req, res) => {
  const { message, agent } = req.body;

  try {
    const saved = await Output.create({
      content: message,
      agent,
      userId: req.user.id
    });

    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: "khtech2014@gmail.com",
      subject: "CraftNova Output",
      text: message
    });

    res.json({ status: "Saved + sent", id: saved._id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== HISTORY =====
app.get("/history", authMiddleware, async (req, res) => {
  const data = await Output.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(data);
});

// ===== SERVER =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CraftNova running on port ${PORT}`);
});