import mongoose from "mongoose";

const workflowSchema =
new mongoose.Schema({

  jobId: String,

  workflowType: String,

  payload: Object,

  status: {

    type: String,

    enum: [

      "queued",

      "processing",

      "completed",

      "failed"
    ],

    default: "queued"
  },

  result: Object,

  error: String,

  startedAt: Date,

  completedAt: Date

}, {

  timestamps: true
});

const Workflow =
mongoose.model(
  "Workflow",
  workflowSchema
);

export default Workflow;