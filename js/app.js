
"use strict";

import { fetchData, url } from "./api.js";
import * as module from "./module.js";
import { initializeAIChat, updateWeatherDataForAI } from "./ai-chat.js";




document.addEventListener("DOMContentLoaded", () => {
  const errorSection = document.querySelector("[data-error-content]");

  // Initialize AI Chat
  initializeAIChat();

  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
    const errorHeading = errorSection.querySelector(".mobile-error");
    const mobileMessage = document.createElement("h1");
    mobileMessage.className = "mobile-error-message";
    mobileMessage.textContent = "ERROR: 170V380085";
    errorHeading.replaceWith(mobileMessage);
    mobileMessage.after(document.createElement("br"));
  }

  const cursorDot = document.querySelector(".cursor-dot");
  const cursorOutline = document.querySelector(".cursor-outline");

  if (window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener("mouseenter", () => {
      cursorDot.style.opacity = "1";
      cursorOutline.style.opacity = "1";
    });

    document.addEventListener("mouseleave", () => {
      cursorDot.style.opacity = "0";
      cursorOutline.style.opacity = "0";
    });

    document.addEventListener("mousemove", (e) => {
      if (
        e.clientX >= 0 &&
        e.clientY >= 0 &&
        e.clientX <= window.innerWidth &&
        e.clientY <= window.innerHeight
      ) {
        cursorDot.style.opacity = "1";
        cursorOutline.style.opacity = "1";
        cursorDot.style.left = e.clientX + "px";
        cursorDot.style.top = e.clientY + "px";
        cursorOutline.style.left = e.clientX + "px";
        cursorOutline.style.top = e.clientY + "px";
      } else {
        cursorDot.style.opacity = "0";
        cursorOutline.style.opacity = "0";
      }
    });
  }
});

const addEventOnElements = function (elements, eventType, callback) {
  for (const element of elements) element.addEventListener(eventType, callback);
};

const searchView = document.querySelector("[data-search-view]");
const searchTogglers = document.querySelectorAll("[data-search-toggler]");
const toggleSearch = () => searchView.classList.toggle("active");
addEventOnElements(searchTogglers, "click", toggleSearch);

const searchField = document.querySelector("[data-search-field]");
const searchResult = document.querySelector("[data-search-result]");
let searchTimeout = null;
const searchTimeoutDuration = 500;

searchField.addEventListener("input", function () {
  if (searchTimeout) clearTimeout(searchTimeout);

  if (!searchField.value) {
    searchResult.classList.remove("active");
    searchResult.innerHTML = "";
    searchField.classList.remove("searching");
  } else {
    searchField.classList.add("searching");
  }

  if (searchField.value) {
    searchTimeout = setTimeout(() => {
      fetchData(url.geo(searchField.value), function (locations, error) {
        searchField.classList.remove("searching");

        if (error || !Array.isArray(locations)) {
          console.warn("Search result error or not iterable", error || locations);
          searchResult.innerHTML = "<p class='body-3'>No location found.</p>";
          searchResult.classList.add("active");
          return;
        }

        searchResult.classList.add("active");
        searchResult.innerHTML = `<ul class="view-list" data-search-list></ul>`;
        const items = [];

        for (const { name, lat, lon, country, state } of locations) {
          const searchItem = document.createElement("li");
          searchItem.classList.add("view-item");
          searchItem.innerHTML = `
            <span class="m-icon">location_on</span>
            <div>
              <p class="item-title">${name}</p>
              <p class="label-2 item-subtitle">${state || ""} ${country}</p>
            </div>
            <a href="#/weather?lat=${lat}&lon=${lon}" class="item-link has-state" aria-label="${name} weather" data-search-toggler></a>
          `;

          searchResult.querySelector("[data-search-list]").appendChild(searchItem);
          items.push(searchItem.querySelector("[data-search-toggler]"));
        }

        addEventOnElements(items, "click", () => {
          toggleSearch();
          searchResult.classList.remove("active");
        });
      });
    }, searchTimeoutDuration);
  }
});

const container = document.querySelector("[data-container]");
const loading = document.querySelector("[data-loading]");
const currentLocationBtn = document.querySelector("[data-current-location-btn]");
const errorContent = document.querySelector("[data-error-content]");

export const updateWeather = function (lat, lon) {
  loading.style.display = "grid";
  container.style.overflowY = "hidden";
  container.classList.remove("fade-in");
  errorContent.style.display = "none";

  const currentWeatherSection = document.querySelector("[data-current-weather]");
  const highlightSection = document.querySelector("[data-highlights]");
  const hourlySection = document.querySelector("[data-hourly-forecast]");
  const forecastSection = document.querySelector("[data-5-day-forecast]");

  currentWeatherSection.innerHTML = "";
  highlightSection.innerHTML = "";
  hourlySection.innerHTML = "";
  forecastSection.innerHTML = "";

  if (window.location.hash === "#/current-location") {
    currentLocationBtn.setAttribute("disabled", "");
  } else {
    currentLocationBtn.removeAttribute("disabled");
  }

  fetchData(url.currentWeather(lat, lon), function (currentWeather, error) {
    if (error || !currentWeather || !currentWeather.sys) {
      console.error("❌ Invalid currentWeather", error || currentWeather);
      error404();
      loading.style.display = "none";
      return;
    }

    const {
      weather,
      dt: dateUnix,
      sys: { sunrise: sunriseUnixUTC, sunset: sunsetUnixUTC },
      main: { temp, feels_like, pressure, humidity },
      visibility,
      timezone,
    } = currentWeather;
    const [{ description, icon }] = weather;

    const weatherIcon = description === "broken clouds" ? "04.0d" : icon;
    const card = document.createElement("div");
    card.classList.add("card", "card-lg", "current-weather-card");

    card.innerHTML = `
      <h2 class="title-2 card-title">Now</h2>
      <div class="weapper">
        <p class="heading">${parseInt(temp)}&deg;<sup>c</sup></p>
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
          <p class="title-3 meta-text" data-location></p>
        </li>
      </ul>
    `;

    fetchData(url.reverseGeo(lat, lon), function (locationData, error) {
      if (error || !locationData || !Array.isArray(locationData)) {
        card.querySelector("[data-location]").textContent = "Unknown Location";
        updateWeatherDataForAI(currentWeather, "Unknown Location");
      } else {
        const { name, country } = locationData[0];
        const locationName = `${name}, ${country}`;
        card.querySelector("[data-location]").textContent = locationName;
        
        // Update AI with weather data and location
        updateWeatherDataForAI(currentWeather, locationName);
      }

      currentWeatherSection.appendChild(card);
    });

    // ✅ Highlights: Air Pollution etc.
    fetchData(url.airPollution(lat, lon), function (airPollution, error) {
      if (error || !airPollution || !airPollution.list) {
        console.warn("Air pollution data unavailable:", error);
        return;
      }

      const [
        {
          main: { aqi },
          components: { no2, o3, so2, pm2_5 },
        },
      ] = airPollution.list;

      const card = document.createElement("div");
      card.classList.add("card", "card-lg");

      // Get wind data from current weather
      const windSpeed = currentWeather.wind?.speed || 0;
      const windDeg = currentWeather.wind?.deg || 0;
      const windDirection = module.getWindDirection(windDeg);
      const windSpeedKmh = module.mps_to_kmh(windSpeed);
      
      // Format other weather data
      const visibilityFormatted = module.formatVisibility(visibility);
      const pressureData = module.formatPressure(pressure);
      const sunriseTime = module.getTime(sunriseUnixUTC, timezone);
      const sunsetTime = module.getTime(sunsetUnixUTC, timezone);

      card.innerHTML = `
        <h2 class="title-2" id="highlights-label">Today's Highlights</h2>
        <div class="highlight-list">
          <div class="card card-sm highlight-card one">
            <h3 class="title-3">Air Quality Index</h3>
            <div class="wrapper">
              <span class="m-icon">air</span>
              <ul class="card-list">
                <li class="card-item">
                  <p class="title-1">${pm2_5.toFixed(1)}</p>
                  <p class="label-1">PM<sub>2.5</sub></p>
                </li>
                <li class="card-item">
                  <p class="title-1">${so2.toFixed(1)}</p>
                  <p class="label-1">SO<sub>2</sub></p>
                </li>
                <li class="card-item">
                  <p class="title-1">${no2.toFixed(1)}</p>
                  <p class="label-1">NO<sub>2</sub></p>
                </li>
                <li class="card-item">
                  <p class="title-1">${o3.toFixed(1)}</p>
                  <p class="label-1">O<sub>3</sub></p>
                </li>
              </ul>
            </div>
            <span class="badge aqi-${aqi} label-${aqi}" title="${module.aqiText[aqi].message}">
              ${module.aqiText[aqi].level}
            </span>
          </div>
          
          <div class="card card-sm highlight-card two">
            <h3 class="title-3">Sunrise & Sunset</h3>
            <div class="wrapper">
              <div class="card-list">
                <div class="card-item">
                  <span class="m-icon">wb_sunny</span>
                  <div>
                    <p class="label-1">Sunrise</p>
                    <p class="title-1">${sunriseTime}</p>
                  </div>
                </div>
                <div class="card-item">
                  <span class="m-icon">nights_stay</span>
                  <div>
                    <p class="label-1">Sunset</p>
                    <p class="title-1">${sunsetTime}</p>
                  </div>
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
                <p class="label-1">${humidity >= 70 ? 'High' : humidity >= 40 ? 'Comfortable' : 'Low'}</p>
              </div>
            </div>
          </div>
          
          <div class="card card-sm highlight-card">
            <h3 class="title-3">Pressure</h3>
            <div class="wrapper">
              <span class="m-icon">airwave</span>
              <div class="pressure-info">
                <p class="title-1">${pressureData.hpa}<sub>hPa</sub></p>
                <p class="label-1">${pressure >= 1020 ? 'High' : pressure >= 1000 ? 'Normal' : 'Low'}</p>
              </div>
            </div>
          </div>
          
          <div class="card card-sm highlight-card">
            <h3 class="title-3">Visibility</h3>
            <div class="wrapper">
              <span class="m-icon">remove_red_eye</span>
              <div class="visibility-info">
                <p class="title-1">${visibilityFormatted}</p>
                <p class="label-1">${visibility >= 10000 ? 'Excellent' : visibility >= 5000 ? 'Good' : visibility >= 2000 ? 'Moderate' : visibility >= 1000 ? 'Poor' : 'Very Poor'}</p>
              </div>
            </div>
          </div>
          
          <div class="card card-sm highlight-card">
            <h3 class="title-3">Feels Like</h3>
            <div class="wrapper">
              <span class="m-icon">thermostat</span>
              <div class="feels-like-info">
                <p class="title-1">${Math.round(feels_like)}&deg;<sup>c</sup></p>
                <p class="label-1">${Math.abs(feels_like - temp) <= 2 ? 'Accurate' : feels_like > temp ? 'Warmer' : 'Cooler'}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      highlightSection.appendChild(card);
      
      // Optional AI functionality - only if elements exist
      const aiBtn = document.getElementById("ai-btn");
      const aiOutput = document.getElementById("ai-output");
      
      if (aiBtn && aiOutput) {
        aiBtn.addEventListener("click", async () => {
          aiOutput.textContent = "⏳ Thinking...";
          try{
            const res = await fetch("http://localhost:5001/ask-ai", {
              method: "POST",
              headers: {"Content-Type": "application/json" },
              body: JSON.stringify({question: `Give Me Suggestion for ${description}, temperature ${temp}°C, and humidity ${humidity}%.`})
            });
            const data = await res.json();
            console.log("AI Raw Response:", data);
            if (data.reply) {
              aiOutput.textContent = data.reply;
            } else {
              aiOutput.textContent = "AI Error: No Reply";
            }
          } catch(err){
            aiOutput.textContent = "❌ Failed to fetch suggestion.";
            console.error(err);
          }
        });
      }
    });

    // ✅ Forecast (Hourly + 5 Day)
    fetchData(url.forecast(lat, lon), function (forecast, error) {
      if (error || !forecast || !forecast.list) {
        console.warn("Forecast data unavailable:", error);
        return;
      }

      const { list: forecastList, city: { timezone } } = forecast;

      // Hourly Forecast (next 8)
      hourlySection.innerHTML = `
        <h2 class="title-2">Today at</h2>
        <div class="slider-container">
          <ul class="slider-list" data-temp></ul>
          <ul class="slider-list" data-wind></ul>
        </div>
      `;

      for (let i = 0; i < 8; i++) {
        const {
          dt: dtUnix,
          main: { temp },
          wind: { speed, deg },
          weather,
        } = forecastList[i];

        const [{ icon, description }] = weather;

        const tempLi = document.createElement("li");
        tempLi.classList.add("slider-item");
        tempLi.innerHTML = `
          <div class="card card-sm slider-card">
            <p class="body-3">${module.getHours(dtUnix, timezone)}</p>
            <img src="./public/images/weather_icons/${icon}.png" width="48" height="48" alt="${description}" />
            <p class="body-3">${parseInt(temp)}&deg;</p>
          </div>
        `;

        const windLi = document.createElement("li");
        windLi.classList.add("slider-item");
        const windDirection = module.getWindDirection(deg);
        windLi.innerHTML = `
          <div class="card card-sm slider-card">
            <p class="body-3">${module.getHours(dtUnix, timezone)}</p>
            <img src="./public/images/weather_icons/direction.png" style="transform: rotate(${deg - 180}deg)" width="48" height="48" alt="wind direction ${windDirection}" />
            <p class="body-3">${parseInt(module.mps_to_kmh(speed))} km/h</p>
            <p class="label-2">${windDirection}</p>
          </div>
        `;

        hourlySection.querySelector("[data-temp]").appendChild(tempLi);
        hourlySection.querySelector("[data-wind]").appendChild(windLi);
      }

      // 5-Day Forecast
      forecastSection.innerHTML = `
        <h2 class="title-2">5 Days Forecast</h2>
        <div class="card card-lg forecast-card">
          <ul data-forecast-list></ul>
        </div>
      `;

      for (let i = 7; i < forecastList.length; i += 8) {
        const {
          main: { temp_max },
          weather,
          dt_txt,
        } = forecastList[i];

        const [{ icon, description }] = weather;
        const date = new Date(dt_txt);
        const li = document.createElement("li");
        li.classList.add("card-item");
        li.innerHTML = `
          <div class="icon-wrapper">
            <img src="./public/images/weather_icons/${icon}.png" width="36" height="36" alt="${description}" />
            <span class="span"><p class="title-2">${parseInt(temp_max)}&deg;</p></span>
          </div>
          <p class="label-1">${date.getDate()} ${module.monthNames[date.getMonth()]}</p>
          <p class="label-1">${module.weekDayNames[date.getDay()]}</p>
        `;

        forecastSection.querySelector("[data-forecast-list]").appendChild(li);
      }

      // ✅ Finally: Hide loading and show container
      loading.style.display = "none";
      container.style.overflowY = "auto";
      container.classList.add("fade-in");
    });
  });
};


export const error404 = () => (errorContent.style.display = "flex");
