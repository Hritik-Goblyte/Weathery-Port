
"use strict";

import { config } from "./config.js";

/**
 * Fetch Data From Server with improved error handling
 * @param { string } URL API url
 * @param { Function } callback callback
 */
export const fetchData = async function (URL, callback) {
  try {
    const response = await fetch(`${URL}&appid=${config.API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the API returned an error
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
    return `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric`;
  },
  forecast(lat, lon) {
    return `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric`;
  },
  airPollution(lat, lon) {
    return `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}`;
  },
  reverseGeo(lat, lon) {
    return `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5`;
  },

  /**
   * @param {string} query Search Query For ex :- "New Delhi", "Thailand"
   */
  geo(query) {
    return `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5`;
  },
};
