function getToken() {

  return localStorage.getItem(
    "craftnova_token"
  );
}

function setToken(token) {

  localStorage.setItem(
    "craftnova_token",
    token
  );
}

function logout() {

  localStorage.removeItem(
    "craftnova_token"
  );

  window.location.href =
    "index.html";
}

function authHeaders() {

  return {

    "Content-Type":
      "application/json",

    Authorization:
      `Bearer ${getToken()}`
  };
}

async function verifySession() {

  try {

    const res =
      await fetch(

        `${API_BASE}/crm-metrics`,

        {
          headers:
            authHeaders()
        }
      );

    return res.ok;

  } catch {

    return false;
  }
}