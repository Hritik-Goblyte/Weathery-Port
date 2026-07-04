"use strict";

/**
 * All OpenWeather calls go through Netlify Functions (production)
 * or the local Express server (npm start).
 * API key never touches the browser.
 */

// Detect environment — Netlify functions path vs local server path
const isNetlify = !window.location.hostname.includes("localhost");
const WEATHER_BASE = isNetlify ? "/.netlify/functions/weather" : "/api/weather";
const GEO_BASE     = isNetlify ? "/.netlify/functions/geo"     : "/api/geo";

export const fetchData = async function (URL, callback) {
  try {
    const response = await fetch(URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.cod && data.cod !== 200 && data.cod !== "200") {
      throw new Error(data.message || "API Error");
    }

    callback(data);
  } catch (error) {
    console.error("API Error:", error);
    callback(null, error);
  }
};

export const url = {
  currentWeather(lat, lon) {
    return `${WEATHER_BASE}/weather?lat=${lat}&lon=${lon}&units=metric`;
  },
  forecast(lat, lon) {
    return `${WEATHER_BASE}/forecast?lat=${lat}&lon=${lon}&units=metric`;
  },
  airPollution(lat, lon) {
    return `${WEATHER_BASE}/air_pollution?lat=${lat}&lon=${lon}`;
  },
  reverseGeo(lat, lon) {
    return `${GEO_BASE}/reverse?lat=${lat}&lon=${lon}&limit=5`;
  },
  geo(query) {
    return `${GEO_BASE}/direct?q=${encodeURIComponent(query)}&limit=5`;
  },
};
