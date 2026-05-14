function getClientToken() {

  return localStorage.getItem(
    "craftnova_client_token"
  );
}

function setClientToken(token) {

  localStorage.setItem(
    "craftnova_client_token",
    token
  );
}

function logoutClient() {

  localStorage.removeItem(
    "craftnova_client_token"
  );

  location.reload();
}

function clientHeaders() {

  return {

    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${getClientToken()}`
  };
}

function showSignup() {

  document.getElementById(
    "loginSection"
  ).classList.add("hidden");

  document.getElementById(
    "signupSection"
  ).classList.remove("hidden");
}

async function clientSignup() {

  try {

    const body = {

      name:
        document.getElementById(
          "signupName"
        ).value,

      business:
        document.getElementById(
          "signupBusiness"
        ).value,

      email:
        document.getElementById(
          "signupEmail"
        ).value,

      password:
        document.getElementById(
          "signupPassword"
        ).value
    };

    const res =
      await fetch(

        `${API_BASE}/client-signup`,

        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );

    const data =
      await res.json();

    if (!data.success) {

      alert(
        data.error || "Signup failed"
      );

      return;
    }

    alert(
      "Signup successful"
    );

    location.reload();

  } catch (err) {

    console.error(err);
  }
}

async function clientLogin() {

  try {

    const res =
      await fetch(

        `${API_BASE}/client-login`,

        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            email:
              document.getElementById(
                "clientEmail"
              ).value,

            password:
              document.getElementById(
                "clientPassword"
              ).value
          })
        }
      );

    const data =
      await res.json();

    if (!data.success) {

      document.getElementById(
        "clientError"
      ).innerText =
        data.error || "Login failed";

      return;
    }

    setClientToken(
      data.token
    );

    await loadClientDashboard();

  } catch (err) {

    console.error(err);
  }
}

async function loadClientDashboard() {

  try {

    const res =
      await fetch(

        `${API_BASE}/client-dashboard`,

        {
          headers:
            clientHeaders()
        }
      );

    if (!res.ok) {

      return;
    }

    const data =
      await res.json();

    document.getElementById(
      "loginSection"
    ).classList.add("hidden");

    document.getElementById(
      "signupSection"
    ).classList.add("hidden");

    document.getElementById(
      "dashboardSection"
    ).classList.remove("hidden");

    // ===== METRICS =====

    document.getElementById(
      "clientPaymentsMetric"
    ).innerText =
      data.payments.length;

    document.getElementById(
      "clientBookingsMetric"
    ).innerText =
      data.bookings.length;

    document.getElementById(
      "clientReportsMetric"
    ).innerText =
      data.history.length;

    // ===== PAYMENTS =====

    document.getElementById(
      "clientPayments"
    ).innerHTML =
      data.payments.map(payment => `

        <div class="bg-card border border-border rounded-xl p-4">

          <h4 class="font-bold">
            ${payment.clientBusiness || "Business"}
          </h4>

          <p>
            Amount:
            N$${payment.amount || 0}
          </p>

          <p>
            Status:
            ${payment.status || "pending"}
          </p>

          <p class="text-xs text-gray-400 mt-2">
            ${payment.reference || ""}
          </p>

        </div>

      `).join("");

    // ===== BOOKINGS =====

    document.getElementById(
      "clientBookings"
    ).innerHTML =
      data.bookings.map(booking => `

        <div class="bg-card border border-border rounded-xl p-4">

          <h4 class="font-bold">
            ${booking.clientBusiness || "Business"}
          </h4>

          <p>
            Date:
            ${booking.date || "-"}
          </p>

          <p>
            Time:
            ${booking.time || "-"}
          </p>

          <p>
            Status:
            ${booking.status || "scheduled"}
          </p>

        </div>

      `).join("");

    // ===== HISTORY =====

    document.getElementById(
      "clientHistory"
    ).innerHTML =
      data.history.map(item => `

        <div class="bg-card border border-border rounded-xl p-4">

          <p class="text-xs text-gray-400 mb-2">
            ${item.agent || "client"}
          </p>

          <pre class="whitespace-pre-wrap text-sm">
${item.content || ""}
          </pre>

        </div>

      `).join("");

  } catch (err) {

    console.error(err);
  }
}

function showSection(section) {

  document.getElementById(
    "paymentsSection"
  ).classList.add("hidden");

  document.getElementById(
    "bookingsSection"
  ).classList.add("hidden");

  document.getElementById(
    "historySection"
  ).classList.add("hidden");

  if (section === "payments") {

    document.getElementById(
      "paymentsSection"
    ).classList.remove("hidden");
  }

  if (section === "bookings") {

    document.getElementById(
      "bookingsSection"
    ).classList.remove("hidden");
  }

  if (section === "history") {

    document.getElementById(
      "historySection"
    ).classList.remove("hidden");
  }
}

// ===== CLIENT BOOKING =====

async function submitBooking() {

  try {

    const res =
      await fetch(

        `${API_BASE}/client-booking`,

        {

          method: "POST",

          headers:
            clientHeaders(),

          body: JSON.stringify({

            date:
              document.getElementById(
                "bookingDate"
              ).value,

            time:
              document.getElementById(
                "bookingTime"
              ).value,

            status:
              "scheduled"
          })
        }
      );

    const data =
      await res.json();

    if (!data.success) {

      alert(
        data.error || "Booking failed"
      );

      return;
    }

    alert(
      "Booking submitted"
    );

    await loadClientDashboard();

  } catch (err) {

    console.error(err);
  }
}

// ===== CLIENT PAYMENT =====

async function submitPayment() {

  try {

    const res =
      await fetch(

        `${API_BASE}/client-payment`,

        {

          method: "POST",

          headers:
            clientHeaders(),

          body: JSON.stringify({

            amount:
              document.getElementById(
                "paymentAmount"
              ).value,

            reference:
              document.getElementById(
                "paymentReference"
              ).value,

            status:
              "pending"
          })
        }
      );

    const data =
      await res.json();

    if (!data.success) {

      alert(
        data.error || "Payment failed"
      );

      return;
    }

    alert(
      "Payment submitted"
    );

    await loadClientDashboard();

  } catch (err) {

    console.error(err);
  }
}

// ===== CLIENT AI =====

async function submitAIRequest() {

  try {

    const prompt =
      document.getElementById(
        "clientAIRequest"
      ).value;

    const res =
      await fetch(

        `${API_BASE}/send-email`,

        {

          method: "POST",

          headers:
            clientHeaders(),

          body: JSON.stringify({

            message: prompt,

            agent: "client"
          })
        }
      );

    const data =
      await res.json();

    if (!data.success) {

      alert(
        data.error || "AI failed"
      );

      return;
    }

    alert(
      "AI request completed"
    );

    await loadClientDashboard();

  } catch (err) {

    console.error(err);
  }
}

window.onload = async () => {

  if (getClientToken()) {

    await loadClientDashboard();
  }
};