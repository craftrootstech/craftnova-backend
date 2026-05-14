import { Worker } from "bullmq";

import redisConnection
from "../config/redis.js";

const workflowWorker = new Worker(

    "workflowQueue",

    async (job) => {

        console.log(
            "Processing workflow:",
            job.id
        );

        console.log(
            "Workflow data:",
            job.data
        );

        return {
            success: true
        };
    },

    {
        connection: redisConnection
    }
);

workflowWorker.on(
    "completed",
    (job) => {

        console.log(
            `Workflow ${job.id} completed`
        );
    }
);

workflowWorker.on(
    "failed",
    (job, err) => {

        console.log(
            `Workflow ${job.id} failed`
        );

        console.error(err);
    }
);

export default workflowWorker;