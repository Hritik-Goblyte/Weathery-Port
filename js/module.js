
"use strict";

export const weekDayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * @param {number} dateUnix Unix date in seconds
 * @param {number} timezone Timezone shift from UTC in seconds
 * @returns {string} Date String {format: "Tuesday 2, Jul"}
 */

export const getDate = function (dateUnix, timezone) {
  const date = new Date((dateUnix + timezone) * 1000);
  const weekDayName = weekDayNames[date.getUTCDay()];
  const monthName = monthNames[date.getUTCMonth()];
  return `${weekDayName} ${date.getUTCDate()}, ${monthName}`;
};

/**
 * @param {number} timeUnix Unix time in seconds
 * @param {number} timezone Timezone shift from UTC in seconds
 * @returns {string} Time String {format: "HH AM/PM"}
 */

export const getHours = function (timeUnix, timezone) {
  const date = new Date((timeUnix + timezone) * 1000);
  const hours = date.getUTCHours();
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12} ${period}`;
};

export const getTime = function (timeUnix, timezone) {
  const date = new Date((timeUnix + timezone) * 1000);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
}; 

/**
 * @param {number} mps meter/seconds
 * @returns {number} kilometer/hours
 */
export const mps_to_kmh = (mps) => {
  const kmh = mps * 3.6; // Correct conversion: 1 m/s = 3.6 km/h
  return Math.round(kmh * 10) / 10; // Round to 1 decimal place
};

/**
 * Convert meters to kilometers with appropriate unit
 * @param {number} meters 
 * @returns {string} formatted distance
 */
export const formatVisibility = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

/**
 * Convert pressure from hPa to different units
 * @param {number} hpa pressure in hectopascals
 * @returns {object} pressure in different units
 */
export const formatPressure = (hpa) => {
  return {
    hpa: Math.round(hpa),
    inHg: (hpa * 0.02953).toFixed(2),
    mmHg: Math.round(hpa * 0.75006)
  };
};

/**
 * Get wind direction from degrees
 * @param {number} degrees wind direction in degrees
 * @returns {string} wind direction abbreviation
 */
export const getWindDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

/**
 * Get UV Index description
 * @param {number} uvIndex 
 * @returns {object} UV index info
 */
export const getUVIndexInfo = (uvIndex) => {
  if (uvIndex <= 2) return { level: 'Low', color: '#55e755' };
  if (uvIndex <= 5) return { level: 'Moderate', color: '#f6f657' };
  if (uvIndex <= 7) return { level: 'High', color: '#bf9e60' };
  if (uvIndex <= 10) return { level: 'Very High', color: '#e37ac2' };
  return { level: 'Extreme', color: '#e66e5e' };
};

export const aqiText = {
  1: {
    level: "Good",
    message:
      "Air quality is considered satisfactory, & air pollution possess little or no risk.",
  },
  2: {
    level: "Fair",
    message:
      "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.",
  },
  3: {
    level: "Moderate",
    message:
      "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
  },
  4: {
    level: "Poor",
    message:
      "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.",
  },
  5: {
    level: "Very Poor",
    message:
      "Health warnings of emergency conditions. The entire population is more likely to be affected.",
  },
};

/**
 * Temperature conversion utilities
 */
export const temperature = {
  celsiusToFahrenheit(celsius) {
    return Math.round((celsius * 9/5) + 32);
  },
  
  fahrenheitToCelsius(fahrenheit) {
    return Math.round((fahrenheit - 32) * 5/9);
  },
  
  format(temp, unit = 'celsius') {
    if (unit === 'fahrenheit') {
      return `${this.celsiusToFahrenheit(temp)}°F`;
    }
    return `${Math.round(temp)}°C`;
  }
};

/**
 * Format numbers with appropriate precision
 */
export const formatNumber = (num, decimals = 0) => {
  return Number(num).toFixed(decimals);
};

/**
 * Debounce function for search input
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};