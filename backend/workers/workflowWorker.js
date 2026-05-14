import { Worker }
from "bullmq";

import redisConnection
from "../config/redis.js";

import Workflow
from "../models/Workflow.js";

import { executeWorkflow }
from "../orchestrator/workflowExecutor.js";

console.log(
  "Initializing workflow worker..."
);

const worker =
new Worker(

  "workflowQueue",

  async (job) => {

    console.log(
      "Job received:",
      job.id
    );

    const workflow =
    await Workflow.findById(
      job.data.workflowId
    );

    if (!workflow) {

      console.log(
        "Workflow not found"
      );

      return;
    }

    try {

      workflow.status =
        "processing";

      workflow.startedAt =
        new Date();

      await workflow.save();

      console.log(
        "Executing workflow:",
        workflow._id
      );

      const result =
      await executeWorkflow(
        workflow
      );

      if (!result.success) {

        throw new Error(
          result.error
        );
      }

      workflow.status =
        "completed";

      workflow.result =
        result;

      workflow.completedAt =
        new Date();

      await workflow.save();

      console.log(
        "Workflow completed:",
        workflow._id
      );

    } catch (error) {

      workflow.status =
        "failed";

      workflow.error =
        error.message;

      await workflow.save();

      console.error(
        "Workflow failed:",
        error
      );
    }
  },

  {
    connection:
      redisConnection
  }
);

worker.on(
  "completed",

  (job) => {

    console.log(
      `Job ${job.id} completed`
    );
  }
);

worker.on(
  "failed",

  (job, err) => {

    console.error(
      `Job ${job?.id} failed:`,
      err
    );
  }
);

worker.on(
  "error",

  (err) => {

    console.error(
      "Worker error:",
      err
    );
  }
);

console.log(
  "Workflow worker ready"
);

export default worker;
