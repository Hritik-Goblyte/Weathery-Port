"use strict";

import { fetchData, url } from "./api.js";
import * as module from "./module.js";
import { initializeAIChat, updateWeatherDataForAI } from "./ai-chat.js";

// ── App state ────────────────────────────────────────────────────────────────
const state = {
  currentWeather: null,
  currentLat: null,
  currentLon: null,
  unit: "metric", // "metric" | "imperial"
  savedCities: [],
  activeCity: null,
};

// ── Persist settings & cities ────────────────────────────────────────────────
function loadState() {
  try {
    const u = localStorage.getItem("weathery_unit");
    if (u) state.unit = u;
    const c = localStorage.getItem("weathery_cities");
    if (c) state.savedCities = JSON.parse(c);
  } catch {}
}

function saveCity(weather, lat, lon) {
  state.savedCities = state.savedCities.filter(c => c.city !== weather.name);
  state.savedCities.unshift({
    city: weather.name,
    country: weather.sys.country,
    lat, lon,
    temp: weather.main.temp,
    icon: weather.weather[0].icon,
    description: weather.weather[0].description,
    savedAt: Date.now(),
  });
  state.savedCities = state.savedCities.slice(0, 12);
  localStorage.setItem("weathery_cities", JSON.stringify(state.savedCities));
  renderCitiesList();
  updateCitiesBadge();
}

function removeCity(cityName) {
  state.savedCities = state.savedCities.filter(c => c.city !== cityName);
  localStorage.setItem("weathery_cities", JSON.stringify(state.savedCities));
  renderCitiesList();
  updateCitiesBadge();
}

function updateCitiesBadge() {
  const badge = document.getElementById("cities-badge");
  if (!badge) return;
  if (state.savedCities.length > 0) {
    badge.textContent = state.savedCities.length;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// ── Top progress bar ─────────────────────────────────────────────────────────
const progress = document.getElementById("top-progress");
let progressTimer = null;

function startProgress() {
  if (!progress) return;
  progress.style.width = "0%";
  progress.style.opacity = "1";
  let w = 0;
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    w = Math.min(w + Math.random() * 12, 88);
    progress.style.width = w + "%";
  }, 200);
}

function finishProgress() {
  if (!progress) return;
  clearInterval(progressTimer);
  progress.style.width = "100%";
  setTimeout(() => { progress.style.opacity = "0"; progress.style.width = "0%"; }, 500);
}

// ── Weather particle engine ───────────────────────────────────────────────────
const canvas = document.getElementById("weather-canvas");
const ctx2d  = canvas?.getContext("2d");
let particles   = [];
let particleRAF = null;
let particleType = null; // "rain" | "snow" | "stars" | null

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createParticles(type) {
  particleType = type;
  particles = [];
  if (!canvas) return;

  if (type === "rain") {
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: Math.random() * 18 + 10,
        speed: Math.random() * 8 + 10,
        opacity: Math.random() * 0.3 + 0.1,
        width: Math.random() * 1 + 0.5,
      });
    }
  } else if (type === "snow") {
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3 + 1,
        speed: Math.random() * 1.2 + 0.4,
        drift: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
  } else if (type === "stars") {
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }
  } else if (type === "clouds") {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.35),
        r: Math.random() * 60 + 40,
        speed: Math.random() * 0.2 + 0.05,
        opacity: Math.random() * 0.04 + 0.02,
      });
    }
  }
}

function drawParticles() {
  if (!ctx2d || !canvas) return;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  if (particleType === "rain") {
    particles.forEach(p => {
      ctx2d.save();
      ctx2d.strokeStyle = `rgba(147,197,253,${p.opacity})`;
      ctx2d.lineWidth = p.width;
      ctx2d.beginPath();
      ctx2d.moveTo(p.x, p.y);
      ctx2d.lineTo(p.x - 2, p.y + p.len);
      ctx2d.stroke();
      ctx2d.restore();
      p.y += p.speed;
      if (p.y > canvas.height) { p.y = -p.len; p.x = Math.random() * canvas.width; }
    });
  } else if (particleType === "snow") {
    particles.forEach(p => {
      ctx2d.save();
      ctx2d.fillStyle = `rgba(220,240,255,${p.opacity})`;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
    });
  } else if (particleType === "stars") {
    particles.forEach(p => {
      p.pulse += p.speed;
      const op = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx2d.save();
      ctx2d.fillStyle = `rgba(255,255,255,${op})`;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    });
  } else if (particleType === "clouds") {
    particles.forEach(p => {
      ctx2d.save();
      ctx2d.fillStyle = `rgba(200,220,255,${p.opacity})`;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
      p.x += p.speed;
      if (p.x - p.r > canvas.width) p.x = -p.r;
    });
  }

  particleRAF = requestAnimationFrame(drawParticles);
}

function startParticles(type) {
  if (particleRAF) cancelAnimationFrame(particleRAF);
  if (!canvas) return;

  if (!type) {
    canvas.classList.remove("active");
    particles = [];
    return;
  }

  createParticles(type);
  canvas.classList.add("active");
  drawParticles();
}

function getParticleType(iconCode) {
  if (!iconCode) return null;
  const m = iconCode.slice(0, 2);
  const n = iconCode.endsWith("n");
  if (m === "09" || m === "10" || m === "11") return "rain";
  if (m === "13") return "snow";
  if (m === "01" && n) return "stars";
  if (m === "03" || m === "04") return "clouds";
  return null;
}

// ── Toast notifications ──────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add("toast--show"), 10);
  setTimeout(() => {
    toast.classList.remove("toast--show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Weather background gradient ───────────────────────────────────────────────
function applyWeatherBg(iconCode, description) {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;

  const main = iconCode?.slice(0, 2);
  const isNight = iconCode?.endsWith("n");

  let grad;
  if (isNight)              grad = "radial-gradient(ellipse at top, #0d1b3e 0%, #0d1421 60%)";
  else if (main === "01")   grad = "radial-gradient(ellipse at top, #1a3a6e 0%, #0d1421 60%)";
  else if (main === "11")   grad = "radial-gradient(ellipse at top, #1a1040 0%, #0d1421 60%)";
  else if (main === "09" || main === "10") grad = "radial-gradient(ellipse at top, #0e2238 0%, #0d1421 60%)";
  else if (main === "13")   grad = "radial-gradient(ellipse at top, #1a2a3a 0%, #0d1421 60%)";
  else if (main === "50")   grad = "radial-gradient(ellipse at top, #1a2020 0%, #0d1421 60%)";
  else                      grad = "radial-gradient(ellipse at top, #122040 0%, #0d1421 60%)";

  shell.style.background = grad;
  shell.style.transition = "background 1.2s ease";

  // Start matching particles
  startParticles(getParticleType(iconCode));
}

// ── Share weather ─────────────────────────────────────────────────────────────
function shareWeather(weather, locationName) {
  if (!weather) return;
  const { main: { temp, humidity }, weather: w, wind } = weather;
  const [{ description }] = w;
  const text = `🌤 Weather in ${locationName}\n🌡 ${Math.round(temp)}°C — ${description}\n💧 Humidity: ${humidity}%\n💨 Wind: ${(wind.speed * 3.6).toFixed(1)} km/h\n\nPowered by WeatheryPort`;

  if (navigator.share) {
    navigator.share({ title: `Weather in ${locationName}`, text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 Weather copied to clipboard!", "success");
    }).catch(() => {
      showToast("Couldn't copy weather info", "error");
    });
  }
}
function cvtTemp(celsius) {
  return state.unit === "imperial"
    ? Math.round(celsius * 9 / 5 + 32)
    : Math.round(celsius);
}
function tempUnit() { return state.unit === "imperial" ? "°F" : "°C"; }

// ── DOM references ───────────────────────────────────────────────────────────
const container          = document.querySelector("[data-container]");
const loading            = document.querySelector("[data-loading]");
const currentLocationBtn = document.querySelector("[data-current-location-btn]");
const errorContent       = document.querySelector("[data-error-content]");
const searchField        = document.querySelector("[data-search-field]");
const searchResult       = document.querySelector("[data-search-result]");
const searchSpinner      = document.querySelector("[data-search-spinner]");

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initializeAIChat();
  initCursor();
  initTabs();
  initSearch();
  initSettings();
  renderCitiesList();
  updateCitiesBadge();
});

// ── Custom cursor ────────────────────────────────────────────────────────────
function initCursor() {
  const dot     = document.querySelector(".cursor-dot");
  const outline = document.querySelector(".cursor-outline");
  if (!dot || !outline) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;

  document.addEventListener("mousemove", e => {
    const inside = e.clientX >= 0 && e.clientY >= 0 &&
      e.clientX <= window.innerWidth && e.clientY <= window.innerHeight;
    const op = inside ? "1" : "0";
    dot.style.opacity = op;
    outline.style.opacity = op;
    dot.style.left = e.clientX + "px";
    dot.style.top  = e.clientY + "px";
    outline.style.left = e.clientX + "px";
    outline.style.top  = e.clientY + "px";
  });
}

// ── Sidebar tabs ─────────────────────────────────────────────────────────────
function initTabs() {
  const btns   = document.querySelectorAll("[data-tab]");
  const panels = document.querySelectorAll("[data-tab-panel]");

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      btns.forEach(b => b.classList.toggle("sidebar-btn--active", b.getAttribute("data-tab") === target));
      panels.forEach(p => p.classList.toggle("tab-panel--active", p.getAttribute("data-tab-panel") === target));
    });
  });
}

// ── Search ───────────────────────────────────────────────────────────────────
function initSearch() {
  let timeout = null;

  searchField.addEventListener("input", () => {
    clearTimeout(timeout);
    const val = searchField.value.trim();

    if (!val) {
      searchResult.innerHTML = "";
      searchResult.classList.remove("active");
      searchSpinner.classList.remove("active");
      return;
    }

    searchSpinner.classList.add("active");

    timeout = setTimeout(() => {
      fetchData(url.geo(val), (locations, err) => {
        searchSpinner.classList.remove("active");

        if (err || !Array.isArray(locations) || !locations.length) {
          searchResult.innerHTML = `<p style="padding:12px 16px;color:rgba(255,255,255,0.3);font-size:1.3rem">No location found</p>`;
          searchResult.classList.add("active");
          return;
        }

        const list = document.createElement("ul");
        list.className = "view-list";

        for (const { name, lat, lon, country, state: st } of locations) {
          const li = document.createElement("li");
          li.className = "view-item";
          li.innerHTML = `
            <span class="m-icon" style="color:rgba(255,255,255,0.35);font-size:1.6rem">location_on</span>
            <div>
              <p class="item-title">${name}</p>
              <p class="item-subtitle">${st ? st + ", " : ""}${country}</p>
            </div>
            <a href="#/weather?lat=${lat}&lon=${lon}" class="item-link has-state" aria-label="${name} weather"></a>
          `;
          li.querySelector(".item-link").addEventListener("click", () => {
            searchResult.classList.remove("active");
            searchField.value = "";
          });
          list.appendChild(li);
        }

        searchResult.innerHTML = "";
        searchResult.appendChild(list);
        searchResult.classList.add("active");
      });
    }, 500);
  });

  // Close on outside click
  document.addEventListener("click", e => {
    if (!searchResult.contains(e.target) && e.target !== searchField) {
      searchResult.classList.remove("active");
    }
  });
}

// ── Settings ─────────────────────────────────────────────────────────────────
function initSettings() {
  const unitBtns = document.querySelectorAll("[data-unit]");

  // Set initial active state
  unitBtns.forEach(btn => {
    btn.classList.toggle("seg-btn--active", btn.getAttribute("data-unit") === state.unit);
  });

  unitBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const newUnit = btn.getAttribute("data-unit");
      if (newUnit === state.unit) return;
      state.unit = newUnit;
      localStorage.setItem("weathery_unit", newUnit);
      unitBtns.forEach(b => b.classList.toggle("seg-btn--active", b.getAttribute("data-unit") === newUnit));

      // Re-render if weather is loaded
      if (state.currentLat && state.currentLon) {
        updateWeather(state.currentLat, state.currentLon);
      }
    });
  });
}

// ── Cities list ──────────────────────────────────────────────────────────────
function getWeatherEmoji(icon) {
  const c = icon.slice(0, 2);
  if (c === "01") return "☀️";
  if (c === "02") return "🌤️";
  if (c === "03" || c === "04") return "☁️";
  if (c === "09") return "🌧️";
  if (c === "10") return "🌦️";
  if (c === "11") return "⛈️";
  if (c === "13") return "❄️";
  if (c === "50") return "🌫️";
  return "🌡️";
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderCitiesList() {
  const list = document.getElementById("cities-list");
  if (!list) return;

  if (!state.savedCities.length) {
    list.innerHTML = `
      <div class="cities-empty">
        <span>🏙️</span>
        <p>No saved cities yet</p>
        <small>Cities are saved automatically when you search for them</small>
      </div>`;
    return;
  }

  list.innerHTML = state.savedCities.map(c => {
    const isActive = c.city === state.activeCity;
    const temp = cvtTemp(c.temp);
    const unit = tempUnit();
    return `
      <div class="city-card ${isActive ? "city-card--active" : ""}"
           data-city="${c.city}" data-lat="${c.lat}" data-lon="${c.lon}">
        <div class="city-card-icon">${getWeatherEmoji(c.icon)}</div>
        <div class="city-card-info">
          <div class="city-card-name">
            ${c.city}
            ${isActive ? `<span class="city-card-active-badge">Active</span>` : ""}
          </div>
          <div class="city-card-desc">${c.description} · ${c.country}</div>
        </div>
        <div>
          <div class="city-card-temp">${temp}${unit}</div>
          <div class="city-card-time">${timeAgo(c.savedAt)}</div>
        </div>
        <button class="city-card-remove" data-remove="${c.city}" aria-label="Remove ${c.city}">✕</button>
      </div>
    `;
  }).join("");

  // Click to load city
  list.querySelectorAll(".city-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.classList.contains("city-card-remove")) return;
      const lat = card.getAttribute("data-lat");
      const lon = card.getAttribute("data-lon");
      window.location.hash = `#/weather?lat=${lat}&lon=${lon}`;
      // Switch to weather tab
      document.querySelector("[data-tab='weather']")?.click();
    });
  });

  // Remove city
  list.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      removeCity(btn.getAttribute("data-remove"));
    });
  });
}

// ── Main weather update ──────────────────────────────────────────────────────
export const updateWeather = function (lat, lon) {
  state.currentLat = lat;
  state.currentLon = lon;

  startProgress();
  loading.style.display = "grid";
  errorContent.style.display = "none";

  const currentWeatherSection = document.querySelector("[data-current-weather]");
  const highlightSection      = document.querySelector("[data-highlights]");
  const hourlySection         = document.querySelector("[data-hourly-forecast]");
  const forecastSection       = document.querySelector("[data-5-day-forecast]");

  currentWeatherSection.innerHTML = "";
  highlightSection.innerHTML      = "";
  hourlySection.innerHTML         = "";
  forecastSection.innerHTML       = "";

  if (window.location.hash === "#/current-location") {
    currentLocationBtn?.setAttribute("disabled", "");
  } else {
    currentLocationBtn?.removeAttribute("disabled");
  }

  fetchData(url.currentWeather(lat, lon), (currentWeather, err) => {
    if (err || !currentWeather?.sys) {
      error404();
      loading.style.display = "none";
      finishProgress();
      return;
    }

    state.currentWeather = currentWeather;

    const {
      weather,
      dt: dateUnix,
      sys: { sunrise: sunriseUnixUTC, sunset: sunsetUnixUTC },
      main: { temp, feels_like, pressure, humidity },
      visibility,
      timezone,
    } = currentWeather;

    const [{ description, icon }] = weather;
    const weatherIcon = description === "broken clouds" ? "04d" : icon;

    const card = document.createElement("div");
    card.classList.add("card", "card-lg", "current-weather-card");
    card.innerHTML = `
      <div class="current-weather-toprow">
        <h2 class="title-2 card-title">Now</h2>
        <button class="share-btn" data-share-btn aria-label="Share weather">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
      </div>
      <div class="weapper">
        <p class="heading">${cvtTemp(temp)}&deg;<sup>${state.unit === "imperial" ? "F" : "C"}</sup></p>
        <img src="./public/images/weather_icons/${weatherIcon}.png" width="64" height="64" alt="${description}" class="weather-icon" />
      </div>
      <p class="body-3">${description}</p>
      <ul class="meta-list">
        <li class="meta-item">
          <span class="m-icon">calendar_today</span>
          <p class="title-3 meta-text">${module.getDate(dateUnix, timezone)}</p>
        </li>
        <li class="meta-item">
          <span class="m-icon">location_on</span>
          <p class="title-3 meta-text" data-location>Loading…</p>
        </li>
      </ul>
    `;

    fetchData(url.reverseGeo(lat, lon), (locationData, locErr) => {
      const locationName = (!locErr && Array.isArray(locationData) && locationData[0])
        ? `${locationData[0].name}, ${locationData[0].country}`
        : "Unknown Location";

      card.querySelector("[data-location]").textContent = locationName;
      currentWeatherSection.appendChild(card);

      // Share button
      const shareBtn = card.querySelector("[data-share-btn]");
      if (shareBtn) shareBtn.addEventListener("click", () => shareWeather(currentWeather, locationName));

      // Apply weather background
      applyWeatherBg(icon, description);

      state.activeCity = locationData?.[0]?.name || currentWeather.name;
      // pass basic weather now; AQI + forecast will be added when those calls complete
      updateWeatherDataForAI(currentWeather, locationName, null, [], state.unit);
      saveCity(currentWeather, lat, lon);
      renderCitiesList();
    });

    // ── Highlights ───────────────────────────────────────────────────────────
    fetchData(url.airPollution(lat, lon), (airPollution, apErr) => {
      if (apErr || !airPollution?.list) return;

      const [{ main: { aqi }, components: { no2, o3, so2, pm2_5, co, nh3, no, pm10 } }] = airPollution.list;

      const windSpeed     = currentWeather.wind?.speed || 0;
      const windDeg       = currentWeather.wind?.deg   || 0;
      const windDirection = module.getWindDirection(windDeg);
      const windKmh       = module.mps_to_kmh(windSpeed);
      const windDisplay   = state.unit === "imperial"
        ? `${Math.round(windSpeed * 2.237)} mph`
        : `${windKmh} km/h`;

      const visibilityFmt = module.formatVisibility(visibility);
      const sunriseTime   = module.getTime(sunriseUnixUTC, timezone);
      const sunsetTime    = module.getTime(sunsetUnixUTC, timezone);

      const hlCard = document.createElement("div");
      hlCard.classList.add("card", "card-lg");
      hlCard.innerHTML = `
        <h2 class="title-2" id="highlights-label">Today's Highlights</h2>
        <div class="highlight-list">

          <div class="card card-sm highlight-card one">
            <h3 class="title-3">Air Quality Index</h3>
            <div class="wrapper">
              <span class="m-icon">air</span>
              <ul class="card-list">
                <li class="card-item"><p class="title-1">${pm2_5.toFixed(1)}</p><p class="label-1">PM<sub>2.5</sub></p></li>
                <li class="card-item"><p class="title-1">${so2.toFixed(1)}</p><p class="label-1">SO<sub>2</sub></p></li>
                <li class="card-item"><p class="title-1">${no2.toFixed(1)}</p><p class="label-1">NO<sub>2</sub></p></li>
                <li class="card-item"><p class="title-1">${o3.toFixed(1)}</p><p class="label-1">O<sub>3</sub></p></li>
              </ul>
            </div>
            <span class="badge aqi-${aqi} label-${aqi}" title="${module.aqiText[aqi].message}">${module.aqiText[aqi].level}</span>
          </div>

          <div class="card card-sm highlight-card two">
            <h3 class="title-3">Sunrise & Sunset</h3>
            <div class="wrapper">
              <div class="card-list">
                <div class="card-item">
                  <span class="m-icon">wb_sunny</span>
                  <div><p class="label-1">Sunrise</p><p class="title-1">${sunriseTime}</p></div>
                </div>
                <div class="card-item">
                  <span class="m-icon">nights_stay</span>
                  <div><p class="label-1">Sunset</p><p class="title-1">${sunsetTime}</p></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card card-sm highlight-card">
            <h3 class="title-3">Humidity</h3>
            <div class="wrapper">
              <span class="m-icon">humidity_percentage</span>
              <div class="humidity-info">
                <p class="title-1">${humidity}<sub>%</sub></p>
                <p class="label-1">${humidity >= 70 ? "High" : humidity >= 40 ? "Comfortable" : "Low"}</p>
              </div>
            </div>
          </div>

          <div class="card card-sm highlight-card">
            <h3 class="title-3">Pressure</h3>
            <div class="wrapper">
              <span class="m-icon">airwave</span>
              <div class="pressure-info">
                <p class="title-1">${pressure}<sub>hPa</sub></p>
                <p class="label-1">${pressure >= 1020 ? "High" : pressure >= 1000 ? "Normal" : "Low"}</p>
              </div>
            </div>
          </div>

          <div class="card card-sm highlight-card">
            <h3 class="title-3">Visibility</h3>
            <div class="wrapper">
              <span class="m-icon">remove_red_eye</span>
              <div class="visibility-info">
                <p class="title-1">${visibilityFmt}</p>
                <p class="label-1">${visibility >= 10000 ? "Excellent" : visibility >= 5000 ? "Good" : visibility >= 2000 ? "Moderate" : "Poor"}</p>
              </div>
            </div>
          </div>

          <div class="card card-sm highlight-card">
            <h3 class="title-3">Feels Like</h3>
            <div class="wrapper">
              <span class="m-icon">thermostat</span>
              <div class="feels-like-info">
                <p class="title-1">${cvtTemp(feels_like)}&deg;<sup>${state.unit === "imperial" ? "F" : "C"}</sup></p>
                <p class="label-1">${Math.abs(feels_like - temp) <= 2 ? "Accurate" : feels_like > temp ? "Warmer" : "Cooler"}</p>
              </div>
            </div>
          </div>

          <div class="card card-sm highlight-card">
            <h3 class="title-3">Wind</h3>
            <div class="wrapper">
              <span class="m-icon">air</span>
              <div class="visibility-info">
                <p class="title-1">${windDisplay}</p>
                <p class="label-1">${windDirection}</p>
              </div>
            </div>
          </div>

        </div>
      `;
      highlightSection.appendChild(hlCard);

      // Update AI with AQI data
      updateWeatherDataForAI(currentWeather, state.activeCity ? `${state.activeCity}, ${currentWeather.sys.country}` : "Unknown", {
        aqi, pm2_5, pm10: pm10 ?? null, so2, no2, o3, co: co ?? null,
      }, null, state.unit);
    });

    // ── Forecast ─────────────────────────────────────────────────────────────
    fetchData(url.forecast(lat, lon), (forecast, fcErr) => {
      if (fcErr || !forecast?.list) return;

      const { list: forecastList, city: { timezone: fcTz } } = forecast;

      // Hourly
      hourlySection.innerHTML = `
        <h2 class="title-2">Today at</h2>
        <div class="slider-container">
          <ul class="slider-list" data-temp></ul>
          <ul class="slider-list" data-wind></ul>
        </div>
      `;

      for (let i = 0; i < 8; i++) {
        const { dt: dtUnix, main: { temp: t }, wind: { speed, deg }, weather: fw } = forecastList[i];
        const [{ icon: fIcon, description: fDesc }] = fw;
        const wDir = module.getWindDirection(deg);

        const tempLi = document.createElement("li");
        tempLi.className = "slider-item";
        tempLi.innerHTML = `
          <div class="card card-sm slider-card">
            <p class="body-3">${module.getHours(dtUnix, fcTz)}</p>
            <img src="./public/images/weather_icons/${fIcon}.png" width="48" height="48" alt="${fDesc}" />
            <p class="body-3">${cvtTemp(t)}&deg;</p>
          </div>`;

        const windLi = document.createElement("li");
        windLi.className = "slider-item";
        windLi.innerHTML = `
          <div class="card card-sm slider-card">
            <p class="body-3">${module.getHours(dtUnix, fcTz)}</p>
            <img src="./public/images/weather_icons/direction.png" style="transform:rotate(${deg - 180}deg)" width="48" height="48" alt="${wDir}" />
            <p class="body-3">${parseInt(module.mps_to_kmh(speed))} km/h</p>
            <p class="label-2">${wDir}</p>
          </div>`;

        hourlySection.querySelector("[data-temp]").appendChild(tempLi);
        hourlySection.querySelector("[data-wind]").appendChild(windLi);
      }

      // 5-day
      forecastSection.innerHTML = `
        <h2 class="title-2">5 Days Forecast</h2>
        <div class="card card-lg forecast-card">
          <ul data-forecast-list></ul>
        </div>`;

      for (let i = 7; i < forecastList.length; i += 8) {
        const { main: { temp_max }, weather: dw, dt_txt } = forecastList[i];
        const [{ icon: dIcon, description: dDesc }] = dw;
        const date = new Date(dt_txt);
        const li   = document.createElement("li");
        li.className = "card-item";
        li.innerHTML = `
          <div class="icon-wrapper">
            <img src="./public/images/weather_icons/${dIcon}.png" width="36" height="36" alt="${dDesc}" />
            <span class="span"><p class="title-2">${cvtTemp(temp_max)}&deg;</p></span>
          </div>
          <p class="label-1">${date.getDate()} ${module.monthNames[date.getMonth()]}</p>
          <p class="label-1">${module.weekDayNames[date.getDay()]}</p>`;
        forecastSection.querySelector("[data-forecast-list]").appendChild(li);
      }

      loading.style.display = "none";
      finishProgress();

      // Update AI with full forecast data
      const forecastForAI = [];
      for (let i = 7; i < forecastList.length; i += 8) {
        const { main: { temp_min, temp_max }, weather: dw, dt_txt } = forecastList[i];
        const [{ description: dDesc }] = dw;
        forecastForAI.push({ date: dt_txt.split(" ")[0], temp_min, temp_max, description: dDesc });
      }
      updateWeatherDataForAI(currentWeather, state.activeCity ? `${state.activeCity}, ${currentWeather.sys.country}` : "Unknown", null, forecastForAI, state.unit);
    });
  });
};

export const error404 = () => {
  errorContent.style.display = "flex";
};
