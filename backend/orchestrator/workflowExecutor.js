import { marketingAgent }
from "../agents/marketingAgent.js";

import { salesAgent }
from "../agents/salesAgent.js";

import { analyticsAgent }
from "../agents/analyticsAgent.js";

import { emailAgent }
from "../agents/emailAgent.js";

export async function executeWorkflow(
  workflow
) {

  try {

    switch (
      workflow.workflowType
    ) {

      case "marketing":

        return await marketingAgent(
          workflow.payload
        );

      case "sales":

        return await salesAgent(
          workflow.payload
        );

      case "analytics":

        return await analyticsAgent(
          workflow.payload
        );

      case "email":

        return await emailAgent(
          workflow.payload
        );

      default:

        return {

          success: false,

          error:
            "Unknown workflow type"
        };
    }

  } catch (error) {

    console.error(error);

    return {

      success: false,

      error:
        error.message
    };
  }
}