"use strict";

// Use Netlify Functions in production, local server in dev
const isLocal   = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const CHAT_ENDPOINT = isLocal ? "/api/chat" : "/.netlify/functions/chat";

let currentWeatherData = null;
let currentLocationName = null;
let currentAQI = null;
let currentForecast = [];
let currentUnit = "metric"; // "metric" | "imperial"
let chatHistory = [];
let chatOpen = false;

// ── Quick suggestion chips ──────────────────────────────────────────────────
const SUGGESTIONS = [
  "🌂 Umbrella needed?",
  "👕 What to wear?",
  "🏃 Good for outdoor?",
  "💨 How's the air quality?",
  "🌅 Sunrise & sunset?",
];

const SUGGESTION_QUESTIONS = [
  "Should I carry an umbrella today?",
  "What should I wear today?",
  "Is it good weather for outdoor activities?",
  "How's the air quality today?",
  "What are today's sunrise and sunset times?",
];

// ── Build full weather context string ──────────────────────────────────────
function buildWeatherContext(weather, location) {
  if (!weather) return null;
  const { main, weather: w, wind, visibility, sys, timezone, clouds, rain, snow } = weather;
  const [{ description, main: weatherMain }] = w;

  const sunriseTime = new Date((sys.sunrise + timezone) * 1000).toUTCString().slice(17, 22);
  const sunsetTime  = new Date((sys.sunset  + timezone) * 1000).toUTCString().slice(17, 22);
  const windKmh     = (wind.speed * 3.6).toFixed(1);
  const windGustKmh = wind.gust ? (wind.gust * 3.6).toFixed(1) : null;
  const windDir     = windDegreesToDir(wind.deg);
  const aqiLabels   = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];

  // Convert temps based on user unit setting
  const cvt = (c) => currentUnit === "imperial" ? Math.round(c * 9/5 + 32) : Math.round(c);
  const unitLabel = currentUnit === "imperial" ? "°F" : "°C";

  let ctx = `=== CURRENT WEATHER: ${location} ===
Temperature:   ${cvt(main.temp)}${unitLabel} (feels like ${cvt(main.feels_like)}${unitLabel})
Min/Max:       ${cvt(main.temp_min)}${unitLabel} / ${cvt(main.temp_max)}${unitLabel}
Condition:     ${weatherMain} — ${description}
Humidity:      ${main.humidity}%
Pressure:      ${main.pressure} hPa
Visibility:    ${(visibility / 1000).toFixed(1)} km
Cloud cover:   ${clouds?.all ?? "N/A"}%
Wind:          ${windKmh} km/h from ${windDir} (${wind.deg}°)${windGustKmh ? `, gusts up to ${windGustKmh} km/h` : ""}
Sunrise:       ${sunriseTime} UTC
Sunset:        ${sunsetTime} UTC`;

  if (rain?.["1h"]) ctx += `\nRain (last 1h): ${rain["1h"]} mm`;
  if (rain?.["3h"]) ctx += `\nRain (last 3h): ${rain["3h"]} mm`;
  if (snow?.["1h"]) ctx += `\nSnow (last 1h): ${snow["1h"]} mm`;

  if (currentAQI) {
    ctx += `\n\n=== AIR QUALITY ===
AQI:    ${currentAQI.aqi} — ${aqiLabels[currentAQI.aqi] || "Unknown"}
PM2.5:  ${currentAQI.pm2_5?.toFixed(1)} µg/m³
PM10:   ${currentAQI.pm10 != null ? currentAQI.pm10.toFixed(1) + " µg/m³" : "N/A"}
SO2:    ${currentAQI.so2?.toFixed(1)} µg/m³
NO2:    ${currentAQI.no2?.toFixed(1)} µg/m³
O3:     ${currentAQI.o3?.toFixed(1)} µg/m³
CO:     ${currentAQI.co != null ? currentAQI.co.toFixed(1) + " µg/m³" : "N/A"}`;
  }

  if (currentForecast.length) {
    ctx += `\n\n=== 5-DAY FORECAST ===`;
    for (const d of currentForecast) {
      ctx += `\n${d.date}: ${d.description}, High ${cvt(d.temp_max)}${unitLabel} / Low ${cvt(d.temp_min)}${unitLabel}`;
    }
  }

  return ctx;
}

function windDegreesToDir(deg) {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── Public API ──────────────────────────────────────────────────────────────
export const updateWeatherDataForAI = (weather, location, aqiData, forecastData, unit = "metric") => {
  if (weather !== null) {
    currentWeatherData  = weather;
    currentLocationName = location;
    currentUnit = unit;
    chatHistory = [];
  }
  if (aqiData !== null) currentAQI = aqiData;
  if (forecastData !== null) currentForecast = forecastData;

  // Update status indicator in header
  const statusDot = document.querySelector("[data-ai-status]");
  if (statusDot) {
    statusDot.style.background = "#4ade80";
    statusDot.title = `AI ready — ${location}`;
  }

  // Update chat panel status if open
  const statusText = document.querySelector("[data-chat-status]");
  if (statusText) statusText.textContent = `✦ Context loaded — ${location}`;

  // Show suggestions if chat is open
  renderSuggestions();
};

// ── Initialize ──────────────────────────────────────────────────────────────
export const initializeAIChat = () => {
  injectChatHTML();
  bindEvents();
};

// ── Inject chat HTML into the page ─────────────────────────────────────────
function injectChatHTML() {
  const el = document.createElement("div");
  el.id = "ai-chat-root";
  el.innerHTML = `
    <!-- FAB button -->
    <div class="ai-fab-wrapper" id="ai-fab-wrapper">
      <div class="ai-rain-drops" id="ai-rain-drops">
        ${[0,1,2,3,4].map(i => `<div class="ai-rain-drop" style="left:${8+i*12}px;animation-delay:${i*0.22}s"></div>`).join("")}
      </div>
      <button class="ai-fab" id="ai-fab" aria-label="Open AI Weather Assistant">
        <span class="ai-fab-icon" id="ai-fab-icon">☂️</span>
        <span class="ai-fab-live" data-ai-status title="Waiting for weather data"></span>
      </button>
      <p class="ai-fab-label" id="ai-fab-label">AI</p>
    </div>

    <!-- Chat panel -->
    <div class="ai-chat-panel" id="ai-chat-panel" aria-hidden="true">
      <!-- Header -->
      <div class="ai-panel-header">
        <div class="ai-panel-avatar">☂️</div>
        <div class="ai-panel-title-group">
          <p class="ai-panel-title">Weather Assistant</p>
          <p class="ai-panel-subtitle" data-chat-status>Search a city to get started</p>
        </div>
        <div class="ai-panel-live-badge" id="ai-live-badge" style="display:none">
          <span class="ai-live-dot"></span>
          <span>Live</span>
        </div>
        <button class="ai-panel-close" id="ai-panel-close" aria-label="Close chat">✕</button>
      </div>

      <!-- Messages -->
      <div class="ai-messages" id="ai-messages">
        <div class="ai-msg ai-msg--bot">
          <div class="ai-msg-avatar">☂️</div>
          <div class="ai-msg-bubble">Hi! Search for a city and ask me anything about the weather — what to wear, umbrella needed, outdoor plans? ☂️</div>
        </div>
      </div>

      <!-- Suggestions -->
      <div class="ai-suggestions" id="ai-suggestions"></div>

      <!-- Input -->
      <div class="ai-input-row">
        <input
          type="text"
          class="ai-input"
          id="ai-input"
          placeholder="Ask about the weather…"
          maxlength="300"
          autocomplete="off"
        />
        <button class="ai-send-btn" id="ai-send-btn" aria-label="Send">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
}

// ── Bind events ─────────────────────────────────────────────────────────────
function bindEvents() {
  const fab        = document.getElementById("ai-fab");
  const closeBtn   = document.getElementById("ai-panel-close");
  const sendBtn    = document.getElementById("ai-send-btn");
  const input      = document.getElementById("ai-input");

  fab.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", () => closeChat());

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}

function toggleChat() {
  chatOpen ? closeChat() : openChat();
}

function openChat() {
  chatOpen = true;
  const panel    = document.getElementById("ai-chat-panel");
  const fabIcon  = document.getElementById("ai-fab-icon");
  const fabLabel = document.getElementById("ai-fab-label");
  const rainDrops = document.getElementById("ai-rain-drops");

  panel.classList.add("ai-chat-panel--open");
  panel.setAttribute("aria-hidden", "false");
  fabIcon.textContent = "✕";
  fabLabel.style.opacity = "0";
  rainDrops.style.display = "none";

  setTimeout(() => document.getElementById("ai-input")?.focus(), 100);
  scrollMessages();
  renderSuggestions();
}

function closeChat() {
  chatOpen = false;
  const panel     = document.getElementById("ai-chat-panel");
  const fabIcon   = document.getElementById("ai-fab-icon");
  const fabLabel  = document.getElementById("ai-fab-label");
  const rainDrops = document.getElementById("ai-rain-drops");

  panel.classList.remove("ai-chat-panel--open");
  panel.setAttribute("aria-hidden", "true");
  fabIcon.textContent = "☂️";
  fabLabel.style.opacity = "1";
  rainDrops.style.display = "block";
}

// ── Suggestions ─────────────────────────────────────────────────────────────
function renderSuggestions() {
  const container = document.getElementById("ai-suggestions");
  if (!container) return;

  // Only show if weather loaded and chat is early
  if (!currentWeatherData || chatHistory.length > 2) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = SUGGESTIONS.map((label, i) => `
    <button class="ai-suggestion-chip" data-question="${SUGGESTION_QUESTIONS[i]}">${label}</button>
  `).join("");

  container.querySelectorAll(".ai-suggestion-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-question");
      document.getElementById("ai-input").value = q;
      sendMessage();
    });
  });
}

// ── Send message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const input   = document.getElementById("ai-input");
  const sendBtn = document.getElementById("ai-send-btn");
  const message = input.value.trim();

  if (!message) return;

  if (!currentWeatherData) {
    appendMessage("bot", "Please search for a city first so I have weather data to help you!");
    return;
  }

  // Append user message
  appendMessage("user", message);
  input.value = "";
  sendBtn.disabled = true;

  // Add to history
  chatHistory.push({ role: "user", content: message });

  // Hide suggestions after first real message
  renderSuggestions();

  // Show typing indicator
  const typingId = showTyping();

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        weatherContext: buildWeatherContext(currentWeatherData, currentLocationName),
        history: chatHistory.slice(-10),
      }),
    });

    const data = await res.json();
    hideTyping(typingId);

    const reply = data.reply || data.error || "Sorry, something went wrong.";
    appendMessage("bot", reply);
    chatHistory.push({ role: "assistant", content: reply });

  } catch (err) {
    hideTyping(typingId);
    appendMessage("bot", "❌ AI service unavailable. Please try again in a moment.");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────────────
function appendMessage(sender, text) {
  const container = document.getElementById("ai-messages");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `ai-msg ai-msg--${sender === "user" ? "user" : "bot"}`;
  const content = sender === "user" ? escapeHtml(text) : renderMarkdown(text);
  div.innerHTML = `
    ${sender !== "user" ? `<div class="ai-msg-avatar">☂️</div>` : ""}
    <div class="ai-msg-bubble">${content}</div>
    ${sender === "user" ? `<div class="ai-msg-avatar ai-msg-avatar--user">👤</div>` : ""}
  `;

  container.appendChild(div);
  scrollMessages();
}

function showTyping() {
  const container = document.getElementById("ai-messages");
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "ai-msg ai-msg--bot";
  div.innerHTML = `
    <div class="ai-msg-avatar">☂️</div>
    <div class="ai-msg-bubble ai-typing">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(div);
  scrollMessages();
  return id;
}

function hideTyping(id) {
  document.getElementById(id)?.remove();
}

function scrollMessages() {
  const container = document.getElementById("ai-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

// ── Simple markdown renderer ─────────────────────────────────────────────────
function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // bold **text**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // bullet lines starting with • or - or *
    .replace(/^[•\-\*] (.+)$/gm, "<li>$1</li>")
    // wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul class="ai-list">${m}</ul>`)
    // newlines to <br>
    .replace(/\n/g, "<br>");
}
