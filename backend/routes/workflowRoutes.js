import express from "express";

import { workflowQueue }
from "../queues/workflowQueue.js";

const router = express.Router();

router.post(
    "/execute",

    async (req, res) => {

        try {

            const job =
            await workflowQueue.add(

                "workflowExecution",

                {
                    workflowType: "test",
                    payload: req.body
                }
            );

            res.status(200).json({
                success: true,
                message: "Workflow queued",
                jobId: job.id
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

export default router;