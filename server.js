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

// ===== ENVIRONMENT =====

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

  content: String,

  score: String,

  agent: String,

  createdAt: {

    type: Date,

    default: Date.now
  }
});

const Booking = mongoose.model("Booking", {

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

  } catch (err) {

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

function enqueueFollowUps(lead) {

  const now = Date.now();

  const jobs = [

    {
      step: 1,
      delay: 1 * 24 * 60 * 60 * 1000
    },

    {
      step: 2,
      delay: 3 * 24 * 60 * 60 * 1000
    },

    {
      step: 3,
      delay: 5 * 24 * 60 * 60 * 1000
    }
  ];

  jobs.forEach(job => {

    Job.create({

      type: "followup",

      payload: {

        name: lead.name,

        email: lead.email,

        business: lead.business,

        step: job.step
      },

      runAt: new Date(
        now + job.delay
      )
    });
  });
}

// ===== WORKER =====

async function processJobs() {

  try {

    const jobs =
      await Job.find({

        status: "pending",

        runAt: {
          $lte: new Date()
        }

      }).limit(5);

    for (const job of jobs) {

      try {

        job.status = "processing";

        await job.save();

        const {

          name,
          email,
          business,
          step

        } = job.payload;

        let subject = "";
        let text = "";

        if (step === 1) {

          subject =
            "Quick follow-up on your audit";

          text = `
Hi ${name},

Did you review your audit for ${business}?

— CraftNova AI
`;
        }

        if (step === 2) {

          subject =
            `Growth opportunities for ${business}`;

          text = `
Hi ${name},

Businesses like yours often scale faster with optimized strategy.

— CraftNova AI
`;
        }

        if (step === 3) {

          subject =
            "Ready to improve your marketing?";

          text = `
Hi ${name},

We can help implement your full marketing strategy.

Book here:
https://craftrootstech.com/book

— CraftNova AI
`;
        }

        await safeEmail({

          from:
            "noreply@craftrootstech.com",

          to: email,

          subject,

          text
        });

        job.status = "done";

        await job.save();

      } catch (err) {

        job.attempts += 1;

        job.lastError =
          err.message;

        if (job.attempts < 3) {

          job.status = "pending";

          job.runAt =
            new Date(
              Date.now() + 60000
            );

        } else {

          job.status = "failed";
        }

        await job.save();
      }
    }

  } catch (err) {

    console.error(
      "Worker Error:",
      err.message
    );
  }
}

setInterval(
  processJobs,
  10000
);

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
      success: true,
      admin
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
          email: admin.email
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

// ===== CRM =====

app.get("/leads", auth, async (req, res) => {

  try {

    const leads =
      await Lead.find()
        .sort({
          createdAt: -1
        });

    res.json(leads);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/lead-status/:id", auth, async (req, res) => {

  try {

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

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/lead-notes/:id", auth, async (req, res) => {

  try {

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

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/crm-metrics", auth, async (req, res) => {

  try {

    const totalLeads =
      await Lead.countDocuments();

    const newLeads =
      await Lead.countDocuments({
        status: "new"
      });

    const interestedLeads =
      await Lead.countDocuments({
        status: "interested"
      });

    const paidLeads =
      await Lead.countDocuments({
        status: "paid"
      });

    const bookedLeads =
      await Lead.countDocuments({
        status: "booked"
      });

    const clients =
      await Lead.countDocuments({
        status: "client"
      });

    const completed =
      await Lead.countDocuments({
        status: "completed"
      });

    res.json({

      totalLeads,

      newLeads,

      interestedLeads,

      paidLeads,

      bookedLeads,

      clients,

      completed
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== LEAD CAPTURE =====

app.post("/lead", async (req, res) => {

  try {

    const lead =
      await Lead.create(req.body);

    enqueueFollowUps(lead);

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== BOOKINGS =====

app.get("/bookings", auth, async (req, res) => {

  try {

    const bookings =
      await Booking.find()
        .sort({
          createdAt: -1
        });

    res.json(bookings);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== PAYMENTS =====

app.get("/payments", auth, async (req, res) => {

  try {

    const payments =
      await Payment.find()
        .sort({
          createdAt: -1
        });

    res.json(payments);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== HISTORY =====

app.get("/history", auth, async (req, res) => {

  try {

    const history =
      await Output.find()
        .sort({
          createdAt: -1
        })
        .limit(20);

    res.json(history);

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