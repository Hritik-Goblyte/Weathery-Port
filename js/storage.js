"use strict";

/**
 * Local Storage utilities for weather app
 */

const STORAGE_KEYS = {
  FAVORITES: 'weather_favorites',
  LAST_LOCATION: 'weather_last_location',
  SETTINGS: 'weather_settings'
};

export const storage = {
  // Favorite locations management
  getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES)) || [];
    } catch {
      return [];
    }
  },

  addFavorite(location) {
    const favorites = this.getFavorites();
    const exists = favorites.some(fav => 
      Math.abs(fav.lat - location.lat) < 0.01 && 
      Math.abs(fav.lon - location.lon) < 0.01
    );
    
    if (!exists) {
      favorites.unshift(location);
      // Keep only last 10 favorites
      if (favorites.length > 10) favorites.pop();
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
  },

  removeFavorite(lat, lon) {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(fav => 
      !(Math.abs(fav.lat - lat) < 0.01 && Math.abs(fav.lon - lon) < 0.01)
    );
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
  },

  // Last location
  getLastLocation() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_LOCATION));
    } catch {
      return null;
    }
  },

  setLastLocation(location) {
    localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(location));
  },

  // App settings
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {
        temperatureUnit: 'celsius',
        windUnit: 'kmh',
        timeFormat: '12h'
      };
    } catch {
      return {
        temperatureUnit: 'celsius',
        windUnit: 'kmh',
        timeFormat: '12h'
      };
    }
  },

  updateSettings(newSettings) {
    const settings = this.getSettings();
    const updated = { ...settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  }
};