"use strict";

let currentWeatherData = null;
let currentLocationName = null;

export const initializeAIChat = () => {
  const chatInput = document.querySelector('[data-chat-input]');
  const chatSend = document.querySelector('[data-chat-send]');
  const chatMessages = document.querySelector('[data-chat-messages]');
  const quickButtons = document.querySelectorAll('[data-quick-question]');

  if (!chatInput || !chatSend || !chatMessages) return;

  chatSend.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  quickButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const question = btn.getAttribute('data-quick-question');
      if (question) {
        chatInput.value = question;
        handleSendMessage();
      }
    });
  });

  function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessageToChat(message, 'user');
    chatInput.value = '';
    chatSend.disabled = true;

    showTypingIndicator();

    setTimeout(() => {
      const response = generateAIResponse(message);
      hideTypingIndicator();
      addMessageToChat(response, 'ai');
      chatSend.disabled = false;
    }, 1000 + Math.random() * 1000);
  }
};

export const updateWeatherDataForAI = (weatherData, locationName) => {
  currentWeatherData = weatherData;
  currentLocationName = locationName;
};
const addMessageToChat = (message, sender) => {
  const chatMessages = document.querySelector('[data-chat-messages]');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender}-message`;

  const icon = sender === 'ai' ? '🤖' : '👤';
  
  messageDiv.innerHTML = `
    <div class="message-content">
      <span class="message-icon">${icon}</span>
      <p>${message}</p>
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const showTypingIndicator = () => {
  const chatMessages = document.querySelector('[data-chat-messages]');
  if (!chatMessages) return;

  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message ai-message typing-message';
  typingDiv.innerHTML = `
    <div class="message-content">
      <span class="message-icon">🤖</span>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const hideTypingIndicator = () => {
  const typingMessage = document.querySelector('.typing-message');
  if (typingMessage) {
    typingMessage.remove();
  }
};

const generateAIResponse = (question) => {
  if (!currentWeatherData) {
    return "I need weather data to help you. Please wait for the weather information to load first.";
  }

  const {
    weather,
    main: { temp, feels_like, humidity, pressure },
    wind: { speed: windSpeed },
    visibility
  } = currentWeatherData;

  const [{ main: weatherMain, description }] = weather;
  const location = currentLocationName || "your location";
  const q = question.toLowerCase();

  if (q.includes('umbrella') || q.includes('rain')) {
    if (weatherMain.includes('Rain') || weatherMain.includes('Drizzle')) {
      return `Yes, definitely carry an umbrella! It's currently ${description} in ${location}. There's active precipitation, so you'll want to stay dry.`;
    } else if (weatherMain.includes('Clouds') && humidity > 80) {
      return `It might be wise to carry an umbrella. While it's not raining now (${description}), the humidity is quite high at ${humidity}%, which suggests rain could develop.`;
    } else {
      return `No umbrella needed! The weather is ${description} in ${location}, and there's no precipitation expected based on current conditions.`;
    }
  }

  if (q.includes('outdoor') || q.includes('activities')) {
    let response = `For outdoor activities in ${location}: `;
    
    if (weatherMain.includes('Rain') || weatherMain.includes('Storm')) {
      response += "Not ideal - it's raining. Consider indoor activities instead.";
    } else if (temp < 5) {
      response += `It's quite cold at ${Math.round(temp)}°C. Bundle up if you go out.`;
    } else if (temp > 35) {
      response += `It's very hot at ${Math.round(temp)}°C. Stay hydrated and avoid peak sun hours.`;
    } else {
      response += `Great weather for outdoor activities! ${Math.round(temp)}°C with ${description}. Perfect conditions!`;
    }
    
    return response;
  }

  if (q.includes('wear') || q.includes('clothes')) {
    let clothing = [];
    
    if (temp < 0) {
      clothing.push("heavy winter coat", "warm layers", "gloves and hat");
    } else if (temp < 10) {
      clothing.push("warm jacket", "long pants", "closed shoes");
    } else if (temp < 20) {
      clothing.push("light jacket or sweater");
    } else if (temp < 30) {
      clothing.push("light clothing", "t-shirt");
    } else {
      clothing.push("light, breathable clothing", "shorts");
    }

    if (weatherMain.includes('Rain')) {
      clothing.push("waterproof jacket");
    }

    return `For ${Math.round(temp)}°C and ${description} in ${location}, I recommend: ${clothing.join(', ')}. The feels-like temperature is ${Math.round(feels_like)}°C.`;
  }

  return `Based on the current weather in ${location} (${description}, ${Math.round(temp)}°C), I'd be happy to help! You can ask me about clothing recommendations, outdoor activities, or specific weather conditions.`;
};