"use strict";

const OW_KEY  = process.env.OPENWEATHER_API_KEY;
const OW_BASE = "https://api.openweathermap.org";

exports.handler = async (event) => {
  const parts    = event.path.replace(/^\/api\/geo\/?/, "").split("/");
  const endpoint = parts[0] || "";

  const allowed = ["direct", "reverse"];
  if (!allowed.includes(endpoint)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid endpoint" }) };
  }

  const params = new URLSearchParams({ ...(event.queryStringParameters || {}), appid: OW_KEY });
  const apiUrl = `${OW_BASE}/geo/1.0/${endpoint}?${params}`;

  try {
    const r    = await fetch(apiUrl);
    const data = await r.json();
    return {
      statusCode: r.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
