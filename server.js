require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Resend } = require("resend");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(bodyParser.json());

// ===== ENV =====
const JWT_SECRET = process.env.JWT_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

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

// ===== 🚀 LEAD + INTELLIGENCE + OUTREACH =====
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
    // ===== SAVE LEAD =====
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

    // ===== 🧠 INTELLIGENCE AGENT =====
    const platformInsights = `
Platform Presence:
- Facebook: ${facebook ? "Provided ✅" : "Missing ❌"}
- Instagram: ${instagram ? "Provided ✅" : "Missing ❌"}
- LinkedIn: ${linkedin ? "Provided ✅" : "Missing ❌"}
`;

    const strategy = `
Recommended Strategy:
1. ${instagram ? "Leverage Instagram Reels" : "Create Instagram presence"}
2. Optimize messaging for ${industry || "your industry"}
3. Focus on ${goal || "lead generation"}
4. Improve CTAs and funnel structure
`;

    const aiOutput = `
Hi ${name},

Your AI Marketing Audit for:

🏢 ${business}
🏭 ${industry || "General Industry"}

${platformInsights}

🚨 Key Issues:
- Inconsistent content reduces reach
- Weak CTAs reduce conversions
- Poor funnel structure limits growth

🚀 ${strategy}

📈 Growth Potential:
With proper execution, ${business} can increase conversions within 30–60 days.

— CraftNova Intelligence System
`;

    // ===== SAVE OUTPUT =====
    await Output.create({
      content: aiOutput,
      agent: "intelligence",
      userId: null
    });

    // ===== 📧 SEND EMAIL =====
    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: `Your Marketing Audit for ${business}`,
      text: aiOutput
    });

    res.json({
      status: "Lead + Intelligence + Email complete",
      leadId: lead._id
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