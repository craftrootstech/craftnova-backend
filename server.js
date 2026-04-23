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

// ===== HEALTH CHECK ROUTE =====
app.get("/", (req, res) => {
  res.send("CraftNova Backend is Running 🚀");
});

// ===== MONGODB CONNECTION =====
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
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
  message: String,
  createdAt: { type: Date, default: Date.now }
});

// ===== MODELS =====
const User = mongoose.model("User", UserSchema);
const Output = mongoose.model("Output", OutputSchema);
const Lead = mongoose.model("Lead", LeadSchema);

// ===== AUTH MIDDLEWARE =====
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

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
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
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

// ===== 🚀 LEAD CAPTURE + AI PIPELINE =====
app.post("/lead", async (req, res) => {
  const { name, email, business, message } = req.body;

  try {
    const lead = await Lead.create({ name, email, business, message });

    const aiOutput = `
Hi ${name},

Here’s your free marketing audit for ${business}:

🔍 Key Observations:
- Your business likely needs a stronger online presence
- Inconsistent content reduces visibility and engagement
- Your messaging may not clearly convert visitors into customers

🚀 Recommendations:
1. Post consistently (3–5 times per week)
2. Focus on short-form video (Reels/TikTok)
3. Improve your call-to-action (CTA)
4. Highlight your unique value clearly

📈 Growth Opportunity:
With the right strategy, ${business} can significantly increase visibility, engagement, and conversions.

👉 Next Step:
We can help you implement this strategy and grow your business.

— CraftNova AI
`;

    await Output.create({
      content: aiOutput,
      agent: "audit",
      userId: null
    });

    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: email,
      subject: "Your Free Marketing Audit",
      text: aiOutput
    });

    res.json({
      status: "Lead captured + audit sent",
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
      agent: agent || "general",
      userId: req.user.id
    });

    await resend.emails.send({
      from: "noreply@craftrootstech.com",
      to: "khtech2014@gmail.com",
      subject: "CraftNova Output",
      text: message
    });

    res.json({
      status: "Saved + Email sent",
      id: saved._id
    });

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

// ===== START SERVER (FIXED FOR RENDER) =====
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CraftNova backend running on port ${PORT}`);
});