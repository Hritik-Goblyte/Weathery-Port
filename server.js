"use strict";

const express = require("express");
const cors    = require("cors");
const path    = require("path");

// node-fetch v3 is ESM-only, use the built-in fetch from Node 18+
const fetchFn = globalThis.fetch;

const app  = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY   || "";
const OW_API_KEY       = process.env.OPENWEATHER_API_KEY || "";
const OW_BASE          = "https://api.openweathermap.org";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Weather proxy routes (keeps OW key server-side) ─────────────────────────
app.get("/api/weather/:endpoint", async (req, res) => {
  const { endpoint } = req.params;
  const allowed = ["weather", "forecast", "air_pollution"];
  if (!allowed.includes(endpoint)) return res.status(400).json({ error: "Invalid endpoint" });

  const params = new URLSearchParams({ ...req.query, appid: OW_API_KEY });
  const apiUrl = `${OW_BASE}/data/2.5/${endpoint}?${params}`;

  try {
    const r    = await fetchFn(apiUrl);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Weather API failed: " + err.message });
  }
});

app.get("/api/geo/:endpoint", async (req, res) => {
  const { endpoint } = req.params;
  const allowed = ["direct", "reverse"];
  if (!allowed.includes(endpoint)) return res.status(400).json({ error: "Invalid endpoint" });

  const params = new URLSearchParams({ ...req.query, appid: OW_API_KEY });
  const apiUrl = `${OW_BASE}/geo/1.0/${endpoint}?${params}`;

  try {
    const r    = await fetchFn(apiUrl);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Geo API failed: " + err.message });
  }
});

// ── POST /api/chat ───────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, weatherContext, history = [] } = req.body;

  if (!message) return res.status(400).json({ error: "Message required" });

  if (!weatherContext) {
    return res.json({ reply: "Please search for a city first so I have weather context!" });
  }

  // Check key is configured
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    return res.status(500).json({
      error: "Gemini API key not set. Open Weathery-Port/.env and add your GEMINI_API_KEY. Get a free key at https://aistudio.google.com/app/apikey"
    });
  }

  const systemInstruction = `You are WeatherBot, a friendly and knowledgeable weather assistant built into a weather app.

Your rules:
- Answer ONLY weather-related questions using the provided weather data below
- If asked anything unrelated to weather, politely say you can only help with weather topics and redirect
- Reply in the SAME language the user writes in (Hindi, English, etc.)
- Use emojis naturally to make responses feel friendly and engaging
- Always include units when mentioning values (°C, km/h, %, hPa, etc.)
- Be concise — 2-4 sentences max unless the question requires more detail
- Format lists with bullet points using • character
- Use **bold** for key values or important info

Current Weather Data:
${weatherContext}`;

  const contents = [
    ...history.map(h => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const response = await fetchFn(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      const msg = data?.error?.message || "Gemini API returned an error";
      return res.status(500).json({ error: msg });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't generate a response.";

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Failed to reach Gemini API: " + err.message });
  }
});

// ── Serve index.html for all other routes ───────────────────────────────────
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🌤  WeatheryPort server running at http://localhost:${PORT}\n`);
});
