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

window.onload = async () => {

  if (getClientToken()) {

    await loadClientDashboard();
  }
};