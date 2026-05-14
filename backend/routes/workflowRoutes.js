import express from "express";

import { workflowQueue }
from "../queues/workflowQueue.js";

import Workflow
from "../models/Workflow.js";

const router = express.Router();

// =====================================================
// EXECUTE WORKFLOW
// =====================================================

router.post(
  "/execute",

  async (req, res) => {

    try {

      const workflow =
      await Workflow.create({

        workflowType: "test",

        payload: req.body,

        status: "queued"
      });

      const job =
      await workflowQueue.add(

        "workflowExecution",

        {
          workflowId:
            workflow._id,

          payload:
            req.body
        }
      );

      workflow.jobId = job.id;

      await workflow.save();

      res.status(200).json({

        success: true,

        message:
          "Workflow queued",

        workflow
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================================
// GET ALL WORKFLOWS
// =====================================================

router.get(
  "/",

  async (req, res) => {

    try {

      const workflows =
      await Workflow.find()
      .sort({
        createdAt: -1
      });

      res.json({

        success: true,

        count:
          workflows.length,

        workflows
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================================
// GET SINGLE WORKFLOW
// =====================================================

router.get(
  "/:id",

  async (req, res) => {

    try {

      const workflow =
      await Workflow.findById(
        req.params.id
      );

      if (!workflow) {

        return res.status(404).json({

          success: false,

          message:
            "Workflow not found"
        });
      }

      res.json({

        success: true,

        workflow
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

// =====================================================
// WORKFLOW STATUS SUMMARY
// =====================================================

router.get(
  "/status/summary",

  async (req, res) => {

    try {

      const queued =
      await Workflow.countDocuments({
        status: "queued"
      });

      const processing =
      await Workflow.countDocuments({
        status: "processing"
      });

      const completed =
      await Workflow.countDocuments({
        status: "completed"
      });

      const failed =
      await Workflow.countDocuments({
        status: "failed"
      });

      res.json({

        success: true,

        summary: {

          queued,

          processing,

          completed,

          failed
        }
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);

export default router;