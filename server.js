require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { Resend } = require("resend");
const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

// ===== MIDDLEWARE =====

app.use(cors());

app.use(bodyParser.json({
  limit: "10mb"
}));

// ===== ENV =====

const PORT =
  process.env.PORT || 3001;

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== DATABASE =====

mongoose.connect(
  process.env.MONGO_URI
);

mongoose.connection.once("open", () => {

  console.log(
    "✅ MongoDB Connected"
  );
});

mongoose.connection.on("error", err => {

  console.error(
    "❌ MongoDB Error:",
    err.message
  );
});

// ===== HEALTH =====

app.get("/", (req, res) => {

  res.send(
    "🚀 CraftNova Backend Live"
  );
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

  status: {

    type: String,

    default: "new"
  },

  notes: {

    type: String,

    default: ""
  },

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Output = mongoose.model("Output", {

  clientId: mongoose.Schema.Types.ObjectId,

  content: String,

  score: String,

  agent: String,

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Booking = mongoose.model("Booking", {

  clientId: mongoose.Schema.Types.ObjectId,

  name: String,

  email: String,

  business: String,

  date: String,

  time: String,

  status: {

    type: String,

    default: "scheduled"
  },

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Payment = mongoose.model("Payment", {

  clientId: mongoose.Schema.Types.ObjectId,

  name: String,

  email: String,

  business: String,

  amount: Number,

  reference: String,

  proofUrl: String,

  status: {

    type: String,

    default: "pending"
  },

  verifiedAt: Date,

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Job = mongoose.model("Job", {

  type: String,

  payload: Object,

  runAt: Date,

  status: {

    type: String,

    default: "pending"
  },

  attempts: {

    type: Number,

    default: 0
  },

  lastError: String,

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Admin = mongoose.model("Admin", {

  email: {

    type: String,

    unique: true
  },

  password: String,

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Client = mongoose.model("Client", {

  name: String,

  business: String,

  email: {

    type: String,

    unique: true
  },

  password: String,

  createdAt: {

    type: Date,

    default: Date.now
  }
});

// ===== AUTH =====

function auth(req, res, next) {

  const header =
    req.headers.authorization;

  if (!header) {

    return res.status(401).json({
      error: "No token provided"
    });
  }

  try {

    const token =
      header.split(" ")[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.admin = decoded;

    next();

  } catch {

    return res.status(401).json({
      error: "Invalid token"
    });
  }
}

function clientAuth(req, res, next) {

  const header =
    req.headers.authorization;

  if (!header) {

    return res.status(401).json({
      error: "No token provided"
    });
  }

  try {

    const token =
      header.split(" ")[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.client = decoded;

    next();

  } catch {

    return res.status(401).json({
      error: "Invalid token"
    });
  }
}

// ===== HELPERS =====

async function safeEmail(payload) {

  try {

    await resend.emails.send(payload);

  } catch (err) {

    console.error(
      "Email Error:",
      err.message
    );
  }
}

// ===== ADMIN =====

app.post("/create-admin", async (req, res) => {

  try {

    const {

      email,
      password

    } = req.body;

    const exists =
      await Admin.findOne({
        email
      });

    if (exists) {

      return res.status(400).json({
        error:
          "Admin already exists"
      });
    }

    const hashed =
      await bcrypt.hash(
        password,
        10
      );

    const admin =
      await Admin.create({

        email,

        password: hashed
      });

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/admin-login", async (req, res) => {

  try {

    const {

      email,
      password

    } = req.body;

    const admin =
      await Admin.findOne({
        email
      });

    if (!admin) {

      return res.status(401).json({
        error:
          "Invalid credentials"
      });
    }

    const valid =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (!valid) {

      return res.status(401).json({
        error:
          "Invalid credentials"
      });
    }

    const token =
      jwt.sign(

        {
          id: admin._id,
          role: "admin"
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "7d"
        }
      );

    res.json({

      success: true,

      token
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== CLIENT AUTH =====

app.post("/client-signup", async (req, res) => {

  try {

    const {

      name,
      business,
      email,
      password

    } = req.body;

    const exists =
      await Client.findOne({
        email
      });

    if (exists) {

      return res.status(400).json({
        error:
          "Client already exists"
      });
    }

    const hashed =
      await bcrypt.hash(
        password,
        10
      );

    const client =
      await Client.create({

        name,
        business,
        email,

        password: hashed
      });

    res.json({
      success: true,
      client
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/client-login", async (req, res) => {

  try {

    const {

      email,
      password

    } = req.body;

    const client =
      await Client.findOne({
        email
      });

    if (!client) {

      return res.status(401).json({
        error:
          "Invalid credentials"
      });
    }

    const valid =
      await bcrypt.compare(
        password,
        client.password
      );

    if (!valid) {

      return res.status(401).json({
        error:
          "Invalid credentials"
      });
    }

    const token =
      jwt.sign(

        {

          id: client._id,

          email: client.email,

          role: "client"
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "7d"
        }
      );

    res.json({

      success: true,

      token
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== CLIENT DASHBOARD =====

app.get("/client-dashboard", clientAuth, async (req, res) => {

  try {

    const client =
      await Client.findById(
        req.client.id
      );

    const payments =
      await Payment.find({

        clientId:
          req.client.id
      });

    const bookings =
      await Booking.find({

        clientId:
          req.client.id
      });

    const history =
      await Output.find({

        clientId:
          req.client.id
      });

    res.json({

      client,

      payments,

      bookings,

      history
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== CRM =====

app.get("/leads", auth, async (req, res) => {

  const leads =
    await Lead.find()
      .sort({
        createdAt: -1
      });

  res.json(leads);
});

app.post("/lead-status/:id", auth, async (req, res) => {

  const lead =
    await Lead.findByIdAndUpdate(

      req.params.id,

      {
        status:
          req.body.status
      },

      {
        new: true
      }
    );

  res.json({
    success: true,
    lead
  });
});

app.post("/lead-notes/:id", auth, async (req, res) => {

  const lead =
    await Lead.findByIdAndUpdate(

      req.params.id,

      {
        notes:
          req.body.notes
      },

      {
        new: true
      }
    );

  res.json({
    success: true,
    lead
  });
});

app.get("/crm-metrics", auth, async (req, res) => {

  const totalLeads =
    await Lead.countDocuments();

  res.json({
    totalLeads
  });
});

// ===== LEADS =====

app.post("/lead", async (req, res) => {

  const lead =
    await Lead.create(req.body);

  res.json({
    success: true,
    lead
  });
});

// ===== BOOKINGS =====

app.get("/bookings", auth, async (req, res) => {

  const bookings =
    await Booking.find()
      .sort({
        createdAt: -1
      });

  res.json(bookings);
});

// ===== PAYMENTS =====

app.get("/payments", auth, async (req, res) => {

  const payments =
    await Payment.find()
      .sort({
        createdAt: -1
      });

  res.json(payments);
});

app.get("/verify-payment/:id", auth, async (req, res) => {

  const payment =
    await Payment.findByIdAndUpdate(

      req.params.id,

      {

        status: "verified",

        verifiedAt:
          new Date()
      },

      {
        new: true
      }
    );

  res.json({

    success: true,

    payment
  });
});

// ===== HISTORY =====

app.get("/history", auth, async (req, res) => {

  const history =
    await Output.find()
      .sort({
        createdAt: -1
      })
      .limit(20);

  res.json(history);
});

// ===== AI =====

app.post("/send-email", auth, async (req, res) => {

  try {

    const {

      message,
      agent

    } = req.body;

    await safeEmail({

      from:
        "noreply@craftrootstech.com",

      to:
        "info@craftrootstech.com",

      subject:
        `CraftNova AI Output (${agent})`,

      text: message
    });

    await Output.create({

      content: message,

      score: "N/A",

      agent
    });

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== SERVER =====

app.listen(PORT, () => {

  console.log(
    `🚀 CraftNova running on port ${PORT}`
  );
});