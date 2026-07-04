"use strict";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { message, weatherContext, history = [] } = body;

  if (!message) return { statusCode: 400, body: JSON.stringify({ error: "Message required" }) };

  if (!weatherContext) {
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: "Please search for a city first so I have weather context!" }),
    };
  }

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Gemini API key not configured in Netlify environment variables." }),
    };
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
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
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data?.error?.message || "Gemini API error" }),
      };
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to reach Gemini: " + err.message }) };
  }
};
