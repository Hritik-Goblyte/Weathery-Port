"use strict";

// Configuration file for API keys and settings
export const config = {
  // API key - In production, this should be handled by a backend service
  // For now, keeping it here but this is not secure for production
  API_KEY: "24613476c97ce2f14a86850f831da329",
  
  // API endpoints
  BASE_URL: "https://api.openweathermap.org",
  
  // Default location (New Delhi)
  DEFAULT_LOCATION: {
    lat: 28.6138954,
    lon: 77.2090057,
    name: "New Delhi"
  },
  
  // App settings
  SEARCH_TIMEOUT: 500,
  FORECAST_HOURS: 8,
  FORECAST_DAYS: 5
};