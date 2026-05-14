// =====================================================
// AUTH CHECK
// =====================================================

window.onload = async () => {

  const valid =
    await verifySession();

  if (!valid) {

    window.location.href =
      "index.html";

    return;
  }

  const header =
    document.querySelector("header");

  header.innerHTML += `

    <button
      onclick="logout()"
      class="bg-red-600 hover:opacity-90 transition px-4 py-2 rounded-xl text-sm"
    >
      Logout
    </button>
  `;

  await loadHistory();

  await loadPayments();

  await loadBookings();

  await loadLeadMetrics();

  await loadCRM();

  await loadWorkflows();

  // AUTO REFRESH

  setInterval(() => {

    loadWorkflows();

  }, 5000);
};

// =====================================================
// WORKFLOW ENGINE
// =====================================================

async function loadWorkflows() {

  try {

    const response =
      await fetch(

        `${API_BASE}/api/workflows`
      );

    const data =
      await response.json();

    const workflows =
      data.workflows || [];

    // ===== METRICS =====

    const queued =
      workflows.filter(
        w => w.status === "queued"
      ).length;

    const processing =
      workflows.filter(
        w => w.status === "processing"
      ).length;

    const completed =
      workflows.filter(
        w => w.status === "completed"
      ).length;

    const failed =
      workflows.filter(
        w => w.status === "failed"
      ).length;

    document.getElementById(
      "queuedCount"
    ).innerText = queued;

    document.getElementById(
      "processingCount"
    ).innerText = processing;

    document.getElementById(
      "completedCount"
    ).innerText = completed;

    document.getElementById(
      "failedCount"
    ).innerText = failed;

    // ===== WORKFLOW PANEL =====

    document.getElementById(
      "workflowPanel"
    ).innerHTML = workflows.map(workflow => {

      let statusColor =
        "text-yellow-400";

      if (
        workflow.status ===
        "processing"
      ) {

        statusColor =
          "text-blue-400";
      }

      if (
        workflow.status ===
        "completed"
      ) {

        statusColor =
          "text-green-400";
      }

      if (
        workflow.status ===
        "failed"
      ) {

        statusColor =
          "text-red-400";
      }

      return `

        <div
          class="bg-black border border-border rounded-2xl p-5"
        >

          <div
            class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >

            <div class="space-y-2">

              <div
                class="flex items-center gap-3"
              >

                <p class="text-sm text-gray-400">
                  Workflow Type:
                </p>

                <span
                  class="bg-gray-800 px-3 py-1 rounded-lg text-xs uppercase"
                >
                  ${workflow.workflowType}
                </span>

              </div>

              <div
                class="flex items-center gap-3"
              >

                <p class="text-sm text-gray-400">
                  Status:
                </p>

                <span
                  class="${statusColor} font-semibold uppercase text-sm"
                >
                  ${workflow.status}
                </span>

              </div>

              <div class="text-xs text-gray-500">

                <p>
                  Created:
                  ${new Date(
                    workflow.createdAt
                  ).toLocaleString()}
                </p>

                ${
                  workflow.completedAt

                  ? `

                    <p>
                      Completed:
                      ${new Date(
                        workflow.completedAt
                      ).toLocaleString()}
                    </p>

                  `

                  : ""
                }

              </div>

            </div>

            <div class="lg:w-2/3">

              <div
                class="bg-card border border-border rounded-xl p-4 max-h-64 overflow-y-auto"
              >

                <p class="text-xs text-gray-500 mb-3">
                  AI OUTPUT
                </p>

                <pre
                  class="whitespace-pre-wrap text-sm"
                >

${workflow.result?.output || "No output yet"}

                </pre>

              </div>

            </div>

          </div>

        </div>

      `;

    }).join("");

  } catch (err) {

    console.error(err);
  }
}

// =====================================================
// AI
// =====================================================

function detectAgent(input) {

  const text =
    input.toLowerCase();

  if (
    text.includes("marketing") ||
    text.includes("content")
  ) return "marketing";

  if (
    text.includes("sales")
  ) return "sales";

  if (
    text.includes("data") ||
    text.includes("analytics")
  ) return "analytics";

  if (
    text.includes("email")
  ) return "email";

  return "marketing";
}

// =====================================================
// RUN AI
// =====================================================

async function runAI() {

  const input =
    document.getElementById(
      "prompt"
    );

  const output =
    document.getElementById(
      "output"
    );

  const text =
    input.value.trim();

  if (!text) return;

  const workflowType =
    detectAgent(text);

  output.innerHTML += `

    <div class="bg-gray-900 rounded-xl p-4">

      <p class="text-blue-400 mb-2">
        > ${text}
      </p>

      <p class="text-xs text-gray-500">
        Routing to:
        ${workflowType} agent
      </p>

    </div>

  `;

  input.value = "";

  try {

    const response =
      await fetch(

        `${API_BASE}/api/workflows/execute`,

        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            workflowType,

            prompt: text
          })
        }
      );

    const data =
      await response.json();

    output.innerHTML += `

      <div class="bg-black rounded-xl p-4">

        <p class="text-green-400 text-sm">
          Workflow queued successfully
        </p>

        <p class="text-xs text-gray-500 mt-2">
          Workflow ID:
          ${data.workflow?._id}
        </p>

      </div>

    `;

    await loadWorkflows();

  } catch (err) {

    console.error(err);

    output.innerHTML += `

      <div class="bg-red-900 rounded-xl p-4">

        <p class="text-red-300 text-sm">
          Workflow execution failed
        </p>

      </div>

    `;
  }
}

// =====================================================
// LEAD
// =====================================================

async function submitLead() {

  const status =
    document.getElementById(
      "leadStatus"
    );

  status.innerText =
    "Submitting...";

  try {

    const payload = {

      name:
        document.getElementById(
          "leadName"
        ).value,

      email:
        document.getElementById(
          "leadEmail"
        ).value,

      business:
        document.getElementById(
          "leadBusiness"
        ).value
    };

    await fetch(

      `${API_BASE}/lead`,

      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(payload)
      }
    );

    status.innerText =
      "✅ Audit submitted";

  } catch (err) {

    console.error(err);

    status.innerText =
      "❌ Failed";
  }
}

// =====================================================
// HISTORY
// =====================================================

async function loadHistory() {

  try {

    const data =
      await apiGet("/history");

    document.getElementById(
      "historyPanel"
    ).innerHTML =
      data.map(item => `

        <div class="bg-black rounded-xl p-4 border border-border">

          <p class="text-xs text-gray-500 mb-2">
            ${item.agent || "general"}
          </p>

          <pre class="whitespace-pre-wrap text-sm">
${item.content}
          </pre>

        </div>

      `).join("");

  } catch (err) {

    console.error(err);
  }
}

// =====================================================
// PAYMENTS
// =====================================================

async function loadPayments() {

  try {

    const data =
      await apiGet("/payments");

    document.getElementById(
      "metricPayments"
    ).innerText =
      data.length;

    const verified =
      data.filter(
        p => p.status === "verified"
      );

    document.getElementById(
      "metricVerified"
    ).innerText =
      verified.length;

    const revenue =
      verified.reduce(
        (sum, p) =>
          sum + (p.amount || 0),
        0
      );

    document.getElementById(
      "metricRevenue"
    ).innerText =
      `N$${revenue}`;

  } catch (err) {

    console.error(err);
  }
}

// =====================================================
// BOOKINGS
// =====================================================

async function loadBookings() {

  try {

    const data =
      await apiGet("/bookings");

    document.getElementById(
      "metricBookings"
    ).innerText =
      data.length;

  } catch (err) {

    console.error(err);
  }
}

// =====================================================
// CRM METRICS
// =====================================================

async function loadLeadMetrics() {

  try {

    const data =
      await apiGet("/crm-metrics");

    document.getElementById(
      "metricLeads"
    ).innerText =
      data.totalLeads || 0;

  } catch (err) {

    console.error(err);
  }
}

// =====================================================
// CRM
// =====================================================

async function loadCRM() {

  try {

    const leads =
      await apiGet("/leads");

    document.getElementById(
      "crmTable"
    ).innerHTML =
      leads.map(lead => `

        <tr class="border-b border-border">

          <td class="py-4">
            ${lead.business || "-"}
          </td>

          <td class="py-4">
            ${lead.email || "-"}
          </td>

          <td class="py-4">
            ${lead.status || "new"}
          </td>

          <td class="py-4">
            ${lead.notes || "-"}
          </td>

          <td class="py-4 text-green-400">
            Active
          </td>

        </tr>

      `).join("");

  } catch (err) {

    console.error(err);
  }
}