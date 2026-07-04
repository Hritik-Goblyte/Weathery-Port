"use strict";

/**
 * All OpenWeather calls go through our Express server proxy.
 * The API key never touches the browser.
 */
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
    return `/api/weather/weather?lat=${lat}&lon=${lon}&units=metric`;
  },
  forecast(lat, lon) {
    return `/api/weather/forecast?lat=${lat}&lon=${lon}&units=metric`;
  },
  airPollution(lat, lon) {
    return `/api/weather/air_pollution?lat=${lat}&lon=${lon}`;
  },
  reverseGeo(lat, lon) {
    return `/api/geo/reverse?lat=${lat}&lon=${lon}&limit=5`;
  },
  geo(query) {
    return `/api/geo/direct?q=${encodeURIComponent(query)}&limit=5`;
  },
};
