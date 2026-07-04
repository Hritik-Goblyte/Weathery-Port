"use strict";

// Configuration file for API keys and settings
export const config = {
  // API key - In production, this should be handled by a backend service
  // For now, keeping it here but this is not secure for production
  API_KEY: "5479f788a9e4888054cbc582c11662aa",
  
  // API endpoints
  BASE_URL: "https://api.openweathermap.org",
  
  // Default location (New Delhi)
  DEFAULT_LOCATION: {
    lat: 26.6929,
    lon: 77.8797,
    name: "Dhaulpur"
  },
  
  // App settings
  SEARCH_TIMEOUT: 500,
  FORECAST_HOURS: 8,
  FORECAST_DAYS: 5
};