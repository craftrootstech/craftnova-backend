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

const resend = new Resend(
  process.env.RESEND_API_KEY
);

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

// ===== UPDATE LEAD STATUS =====

app.post("/lead-status/:id", async (req, res) => {

  const {
    status
  } = req.body;

  try {

    const lead =
      await Lead.findByIdAndUpdate(

        req.params.id,

        {
          status
        },

        {
          new: true
        }
      );

    if (!lead) {

      return res.status(404).json({
        error: "Lead not found"
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (err) {

    console.error(
      "Lead status update error:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== UPDATE LEAD NOTES =====

app.post("/lead-notes/:id", async (req, res) => {

  const {
    notes
  } = req.body;

  try {

    const lead =
      await Lead.findByIdAndUpdate(

        req.params.id,

        {
          notes
        },

        {
          new: true
        }
      );

    if (!lead) {

      return res.status(404).json({
        error: "Lead not found"
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (err) {

    console.error(
      "Lead notes update error:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== CRM METRICS =====

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

    console.error(
      "CRM metrics error:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
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

  // ===== CRM STATUS =====

  status: {
    type: String,
    default: "new"
  },

  // ===== INTERNAL NOTES =====

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

// ===== LEADS CRM =====

app.get("/leads", async (req, res) => {

  try {

    const leads =
      await Lead.find()
        .sort({
          createdAt: -1
        });

    res.json(leads);

  } catch (err) {

    console.error(
      "Leads fetch error:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== FOLLOW-UP QUEUE =====

function enqueueFollowUps(lead) {

  const now = Date.now();

  const jobs = [

    {
      step: 1,
      delay: 24 * 60 * 60 * 1000
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
by Craftroots Technologies
`;
        }

        if (step === 2) {

          subject =
            `How businesses like ${business} grow faster`;

          text = `
Hi ${name},

Businesses like yours typically grow 2–3x after improving strategy.

— CraftNova AI
by Craftroots Technologies
`;
        }

        if (step === 3) {

          subject =
            "Let’s improve your marketing results";

          text = `
Hi ${name},

We can implement your full strategy and drive results.

Secure your strategy session:
https://craftrootstech.com/pay

— CraftNova AI
by Craftroots Technologies
`;
        }

        try {

          await resend.emails.send({

            from:
              "noreply@craftrootstech.com",

            to: email,

            subject,
            text
          });

        } catch (emailErr) {

          console.error(
            "Follow-up email failed:",
            emailErr.message
          );
        }

        job.status = "done";
        await job.save();

      } catch (err) {

        job.attempts += 1;
        job.lastError = err.message;

        if (job.attempts < 3) {

          job.status = "pending";

          job.runAt = new Date(
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
      "Worker error:",
      err.message
    );
  }
}

setInterval(processJobs, 10000);

// ===== LEAD ROUTE =====

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

    try {

      await resend.emails.send({

        from:
          "noreply@craftrootstech.com",

        to: email,

        subject:
          `Your AI Marketing Audit for ${business}`,

        text: `
Hi ${name},

${raw}

📊 Score: ${score}/100

Secure your strategy session:
https://craftrootstech.com/pay

— CraftNova AI
by Craftroots Technologies
`
      });

    } catch (emailErr) {

      console.error(
        "Lead email failed:",
        emailErr.message
      );
    }

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

// ===== BOOK SESSION =====

app.post("/book", async (req, res) => {

  const {
    name,
    email,
    business,
    date,
    time,
    paymentId
  } = req.body;

  try {

    const payment =
      await Payment.findById(paymentId);

    if (
      !payment ||
      payment.status !== "verified"
    ) {

      return res.status(403).json({
        error:
          "Payment not verified yet"
      });
    }

    const exists =
      await Booking.findOne({
        date,
        time
      });

    if (exists) {

      return res.status(400).json({
        error:
          "Slot already taken"
      });
    }

    const booking =
      await Booking.create({

        name,
        email,
        business,
        date,
        time
      });

    try {

      await resend.emails.send({

        from:
          "noreply@craftrootstech.com",

        to: email,

        subject:
          "Strategy Session Confirmed",

        text: `
Hi ${name},

Your booking has been confirmed.

Business:
${business}

Date:
${date}

Time:
${time}

— CraftNova AI
by Craftroots Technologies
`
      });

    } catch (emailErr) {

      console.error(
        "Booking email failed:",
        emailErr.message
      );
    }

    res.json({
      success: true,
      booking
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== BOOKINGS =====

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

// ===== SUBMIT PAYMENT =====

app.post("/submit-payment", async (req, res) => {

  const {
    name,
    email,
    business,
    amount,
    reference,
    proofUrl
  } = req.body;

  try {

    const payment =
      await Payment.create({

        name,
        email,
        business,
        amount,
        reference,
        proofUrl
      });

    console.log(
      "✅ Payment saved:",
      payment._id
    );

    try {

      await resend.emails.send({

        from:
          "noreply@craftrootstech.com",

        to:
          "info@craftrootstech.com",

        subject:
          "New Payment Submitted",

        text: `
New payment submitted.

Name:
${name}

Email:
${email}

Business:
${business}

Amount:
N$${amount}

Reference:
${reference}

Proof:
${proofUrl}
`
      });

    } catch (emailErr) {

      console.error(
        "Payment email failed:",
        emailErr.message
      );
    }

    res.json({
      success: true,
      paymentId: payment._id
    });

  } catch (err) {

    console.error(
      "❌ PAYMENT ERROR:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== VERIFY PAYMENT =====

app.get("/verify-payment/:id", async (req, res) => {

  try {

    const payment =
      await Payment.findByIdAndUpdate(

        req.params.id,

        {
          status: "verified",
          verifiedAt: new Date()
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

    try {

      await resend.emails.send({

        from:
          "noreply@craftrootstech.com",

        to: payment.email,

        subject:
          "Payment Verified",

        text: `
Hi ${payment.name},

Your payment has been verified successfully.

You may now book your strategy session.

Booking link:
https://craftrootstech.com/book

Payment ID:
${payment._id}

— CraftNova AI
by Craftroots Technologies
`
      });

    } catch (emailErr) {

      console.error(
        "Verification email failed:",
        emailErr.message
      );
    }

    res.json({
      success: true,
      payment
    });

  } catch (err) {

    console.error(
      "Verify payment error:",
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== PAYMENTS =====

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

    const outputs =
      await Output.find()
        .sort({
          createdAt: -1
        })
        .limit(20);

    res.json(outputs);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== SEND EMAIL =====

app.post("/send-email", async (req, res) => {

  const {
    message,
    agent
  } = req.body;

  try {

    try {

      await resend.emails.send({

        from:
          "noreply@craftrootstech.com",

        to:
          "info@craftrootstech.com",

        subject:
          `CraftNova AI Output (${agent})`,

        text: message
      });

    } catch (emailErr) {

      console.error(
        "Send-email route failed:",
        emailErr.message
      );
    }

    await Output.create({

      content: message,
      agent,
      score: "N/A"
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ===== SERVER =====

const PORT =
  process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log(
    "🚀 CraftNova running on port " + PORT
  );
});