// ===== AUTH CHECK =====

window.onload = async () => {

  const valid =
    await verifySession();

  if (!valid) {

    window.location.href =
      "index.html";

    return;
  }

  // ===== LOGOUT BUTTON =====

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
};

// ===== AI =====

function detectAgent(input) {

  const text =
    input.toLowerCase();

  if (
    text.includes("marketing") ||
    text.includes("content")
  ) return "content";

  if (
    text.includes("data")
  ) return "data";

  if (
    text.includes("automation")
  ) return "automation";

  return "general";
}

function executeAgent(agent, input) {

  if (agent === "content") {

    return `
Marketing Strategy:

- Hook
- Value Proposition
- CTA

Topic:
${input}
`;
  }

  if (agent === "data") {

    return `
Data Insights:

${input}
`;
  }

  if (agent === "automation") {

    return `
Automation Workflow:

${input}
`;
  }

  return `
General Response:

${input}
`;
}

// ===== RUN AI =====

async function runAI() {

  const input =
    document.getElementById("prompt");

  const output =
    document.getElementById("output");

  const text =
    input.value.trim();

  if (!text) return;

  const agent =
    detectAgent(text);

  output.innerHTML += `
    <div class="bg-gray-900 rounded-xl p-4">
      <p class="text-blue-400 mb-2">
        > ${text}
      </p>
    </div>
  `;

  const result =
    executeAgent(agent, text);

  output.innerHTML += `
    <div class="bg-black rounded-xl p-4">
      <pre class="whitespace-pre-wrap text-sm">${result}</pre>
    </div>
  `;

  input.value = "";

  await apiPost(
    "/send-email",
    {
      message: result,
      agent
    }
  );
}

// ===== LEAD =====

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

// ===== HISTORY =====

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

// ===== PAYMENTS =====

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

    document.getElementById(
      "paymentsTable"
    ).innerHTML =
      data.map(payment => `

        <tr class="border-b border-border">

          <td class="py-4">
            ${payment.business}
          </td>

          <td class="py-4">
            N$${payment.amount}
          </td>

          <td class="py-4">
            ${payment.status}
          </td>

          <td class="py-4">

            ${
              payment.status !== "verified"

              ? `

              <button
                onclick="verifyPayment('${payment._id}')"
                class="bg-green-600 px-3 py-1 rounded-lg text-xs"
              >
                Verify
              </button>

              `

              : "Verified"
            }

          </td>

        </tr>

      `).join("");

  } catch (err) {

    console.error(err);
  }
}

// ===== VERIFY PAYMENT =====

async function verifyPayment(id) {

  try {

    await apiGet(
      `/verify-payment/${id}`
    );

    await loadPayments();

  } catch (err) {

    console.error(err);
  }
}

// ===== BOOKINGS =====

async function loadBookings() {

  try {

    const data =
      await apiGet("/bookings");

    document.getElementById(
      "metricBookings"
    ).innerText =
      data.length;

    document.getElementById(
      "bookingsTable"
    ).innerHTML =
      data.map(booking => `

        <tr class="border-b border-border">

          <td class="py-4">
            ${booking.business}
          </td>

          <td class="py-4">
            ${booking.date}
          </td>

          <td class="py-4">
            ${booking.time}
          </td>

          <td class="py-4">
            ${booking.status}
          </td>

        </tr>

      `).join("");

  } catch (err) {

    console.error(err);
  }
}

// ===== CRM METRICS =====

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

// ===== CRM =====

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

            <select
              onchange="updateLeadStatus('${lead._id}', this.value)"
              class="bg-black border border-border rounded-lg px-2 py-1"
            >

              ${[
                "new",
                "interested",
                "paid",
                "booked",
                "client",
                "completed"
              ].map(status => `

                <option
                  value="${status}"
                  ${
                    lead.status === status
                    ? "selected"
                    : ""
                  }
                >

                  ${status}

                </option>

              `).join("")}

            </select>

          </td>

          <td class="py-4">

            <textarea
              onchange="updateLeadNotes('${lead._id}', this.value)"
              class="bg-black border border-border rounded-lg p-2 w-full text-xs"
              rows="2"
            >${lead.notes || ""}</textarea>

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

// ===== UPDATE STATUS =====

async function updateLeadStatus(id, status) {

  try {

    await apiPost(

      `/lead-status/${id}`,

      {
        status
      }
    );

  } catch (err) {

    console.error(err);
  }
}

// ===== UPDATE NOTES =====

async function updateLeadNotes(id, notes) {

  try {

    await apiPost(

      `/lead-notes/${id}`,

      {
        notes
      }
    );

  } catch (err) {

    console.error(err);
  }
}