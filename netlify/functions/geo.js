"use strict";

const OW_KEY  = process.env.OPENWEATHER_API_KEY;
const OW_BASE = "https://api.openweathermap.org";

exports.handler = async (event) => {
  // Path is either:
  //   /.netlify/functions/geo/reverse   (Netlify direct)
  //   /api/geo/reverse                  (redirect via netlify.toml)
  const path = event.path || "";
  const endpoint = path
    .replace(/.*\/geo\//, "")
    .split("?")[0]
    .split("/")[0]
    .trim();

  const allowed = ["direct", "reverse"];
  if (!allowed.includes(endpoint)) {
    console.error("Invalid geo endpoint:", endpoint, "path:", path);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Invalid endpoint: "${endpoint}"` }),
    };
  }

  const params = new URLSearchParams({
    ...(event.queryStringParameters || {}),
    appid: OW_KEY,
  });
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
