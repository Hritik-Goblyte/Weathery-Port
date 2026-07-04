"use strict";

// API keys are now handled server-side via .env
// This file only holds non-sensitive app settings
export const config = {
  DEFAULT_LOCATION: {
    lat: 26.6929,
    lon: 77.8797,
    name: "Dhaulpur",
  },
  SEARCH_TIMEOUT: 500,
  FORECAST_HOURS: 8,
  FORECAST_DAYS: 5,
};
