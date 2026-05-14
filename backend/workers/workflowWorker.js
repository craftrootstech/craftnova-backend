import { Worker }
from "bullmq";

import redisConnection
from "../config/redis.js";

import Workflow
from "../models/Workflow.js";

const workflowWorker =
new Worker(

  "workflowQueue",

  async (job) => {

    const workflow =
    await Workflow.findById(
      job.data.workflowId
    );

    try {

      workflow.status =
        "processing";

      workflow.startedAt =
        new Date();

      await workflow.save();

      console.log(
        "Processing workflow:",
        workflow._id
      );

      console.log(
        "Payload:",
        workflow.payload
      );

      // ===== SIMULATED AI EXECUTION =====

      const result = {

        success: true,

        processedAt:
          new Date(),

        message:
          "Workflow executed successfully"
      };

      workflow.status =
        "completed";

      workflow.result =
        result;

      workflow.completedAt =
        new Date();

      await workflow.save();

      console.log(
        "Workflow completed:"
      );

    } catch (error) {

      workflow.status =
        "failed";

      workflow.error =
        error.message;

      await workflow.save();

      console.error(error);
    }
  },

  {
    connection:
      redisConnection
  }
);

export default workflowWorker;