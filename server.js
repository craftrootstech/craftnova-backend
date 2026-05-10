require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { Resend } = require("resend");
const OpenAI = require("openai");

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

// ===== CRM =====

app.get("/leads", async (req, res) => {

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

app.post("/lead-status/:id", async (req, res) => {

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

app.post("/lead-notes/:id", async (req, res) => {

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

app.get("/crm-metrics", async (req, res) => {

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

Business: ${lead.business}
Industry: ${lead.industry || "Not specified"}
Goal: ${lead.goal || "Not specified"}

`;

    const ai =
      await openai.chat.completions.create({

        model: "gpt-4o-mini",

        messages: [

          {
            role: "user",
            content: prompt
          }
        ]
      });

    const raw =
      ai.choices[0].message.content;

    const scoreMatch =
      raw.match(
        /OVERALL SCORE:\s*(\d{1,3})/i
      );

    const score =
      scoreMatch
        ? scoreMatch[1]
        : "N/A";

    await Output.create({

      content: raw,

      score,

      agent: "audit"
    });

    await safeEmail({

      from:
        "noreply@craftrootstech.com",

      to: lead.email,

      subject:
        `Your AI Marketing Audit for ${lead.business}`,

      text: `
Hi ${lead.name},

${raw}

📊 Score: ${score}/100

Book your strategy session:
https://craftrootstech.com/book

— CraftNova AI
`
    });

    enqueueFollowUps(lead);

    res.json({

      success: true,

      score
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== BOOKINGS =====

app.post("/book", async (req, res) => {

  try {

    const {

      paymentId,
      date,
      time

    } = req.body;

    const payment =
      await Payment.findById(paymentId);

    if (
      !payment ||
      payment.status !== "verified"
    ) {

      return res.status(403).json({
        error:
          "Payment not verified"
      });
    }

    const existing =
      await Booking.findOne({
        date,
        time
      });

    if (existing) {

      return res.status(400).json({
        error:
          "Slot already booked"
      });
    }

    const booking =
      await Booking.create(req.body);

    await safeEmail({

      from:
        "noreply@craftrootstech.com",

      to: booking.email,

      subject:
        "Strategy Session Confirmed",

      text: `
Hi ${booking.name},

Your booking has been confirmed.

Date:
${booking.date}

Time:
${booking.time}

— CraftNova AI
`
    });

    res.json({

      success: true,

      booking
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/bookings", async (req, res) => {

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

app.post("/submit-payment", async (req, res) => {

  try {

    const payment =
      await Payment.create(req.body);

    await safeEmail({

      from:
        "noreply@craftrootstech.com",

      to:
        "info@craftrootstech.com",

      subject:
        "New Payment Submitted",

      text: `
Business:
${payment.business}

Amount:
N$${payment.amount}

Reference:
${payment.reference}
`
    });

    res.json({

      success: true,

      paymentId:
        payment._id
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/verify-payment/:id", async (req, res) => {

  try {

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

    if (!payment) {

      return res.status(404).json({
        error:
          "Payment not found"
      });
    }

    await safeEmail({

      from:
        "noreply@craftrootstech.com",

      to: payment.email,

      subject:
        "Payment Verified",

      text: `
Hi ${payment.name},

Your payment has been verified.

You may now proceed with booking.

https://craftrootstech.com/book

— CraftNova AI
`
    });

    res.json({

      success: true,

      payment
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/payments", async (req, res) => {

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

app.get("/history", async (req, res) => {

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

// ===== SEND EMAIL =====

app.post("/send-email", async (req, res) => {

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

      agent,

      score: "N/A"
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