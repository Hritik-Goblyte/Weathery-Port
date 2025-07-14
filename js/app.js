
"use strict";

import { fetchData, url } from "./api.js";
import * as module from "./module.js";




document.addEventListener("DOMContentLoaded", () => {
  const errorSection = document.querySelector("[data-error-content]");

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
      fetchData(url.geo(searchField.value), function (locations) {
        searchField.classList.remove("searching");

        if (!Array.isArray(locations)) {
          console.warn("Search result is not iterable", locations);
          searchResult.innerHTML = "<p class='body-3'>No location found.</p>";
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

  fetchData(url.currentWeather(lat, lon), function (currentWeather) {
    if (!currentWeather || !currentWeather.sys) {
      console.error("❌ Invalid currentWeather", currentWeather);
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

    fetchData(url.reverseGeo(lat, lon), function (locationData) {
      if (locationData && Array.isArray(locationData)) {
        const { name, country } = locationData[0];
        card.querySelector("[data-location]").textContent = `${name}, ${country}`;
      } else {
        card.querySelector("[data-location]").textContent = "Unknown";
      }

      currentWeatherSection.appendChild(card);
    });

    // ✅ Highlights: Air Pollution etc.
    fetchData(url.airPollution(lat, lon), function (airPollution) {
      if (!airPollution || !airPollution.list) return;

      const [
        {
          main: { aqi },
          components: { no2, o3, so2, pm2_5 },
        },
      ] = airPollution.list;

      const card = document.createElement("div");
      card.classList.add("card", "card-lg");

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
        </div>
        
      `;

      highlightSection.appendChild(card);
      document.getElementById("ai-btn").addEventListener("click", async () => {
        const suggestiontext = document.getElementById("ai-output");
        suggestiontext.textContent = "⏳ Thinking...";
        // const weatherInfo = "Overcast and 32.c with 61% humidity";
        try{
          const res = await fetch("http://localhost:5001/ask-ai", {
            method: "POST",
            headers: {"Content-TYpe": "application/json" },
            body: JSON.stringify({question: `Give Me Suggestion for ${description}, temperature ${temp}°C, and humidity ${humidity}%.`})
          });
          const data = await res.json();
          console.log("AI Raw Response:", data);
          if (data.reply) {
            suggestiontext.textContent =  data.reply;
          }else{
            suggestiontext.textContent = "AI Error: No Reply";
          }
        } catch(err){
          suggestiontext.textContent = "❌ Failed to fetch suggestion.";
          console.error(err);
        }
      })
    });

    // ✅ Forecast (Hourly + 5 Day)
    fetchData(url.forecast(lat, lon), function (forecast) {
      if (!forecast || !forecast.list) return;

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
        windLi.innerHTML = `
          <div class="card card-sm slider-card">
            <p class="body-3">${module.getHours(dtUnix, timezone)}</p>
            <img src="./public/images/weather_icons/direction.png" style="transform: rotate(${deg - 180}deg)" width="48" height="48" alt="wind direction" />
            <p class="body-3">${parseInt(module.mps_to_kmh(speed))} km/h</p>
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
