async function apiGet(url) {

  const res =
    await fetch(

      `${API_BASE}${url}`,

      {
        headers:
          authHeaders()
      }
    );

  return await res.json();
}

async function apiPost(url, body = {}) {

  const res =
    await fetch(

      `${API_BASE}${url}`,

      {

        method: "POST",

        headers:
          authHeaders(),

        body:
          JSON.stringify(body)
      }
    );

  return await res.json();
}