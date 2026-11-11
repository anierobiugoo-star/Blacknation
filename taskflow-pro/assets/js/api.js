/**
 * api.js
 * All external API requests live here — weather and daily quotes today,
 * any future integration tomorrow. Every function returns parsed data
 * or throws, so callers (dashboard.js) can drive their own loading/error UI.
 */

const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: 'fa-sun' },
  1: { label: 'Mostly clear', icon: 'fa-sun' },
  2: { label: 'Partly cloudy', icon: 'fa-cloud-sun' },
  3: { label: 'Overcast', icon: 'fa-cloud' },
  45: { label: 'Fog', icon: 'fa-smog' },
  48: { label: 'Rime fog', icon: 'fa-smog' },
  51: { label: 'Light drizzle', icon: 'fa-cloud-rain' },
  53: { label: 'Drizzle', icon: 'fa-cloud-rain' },
  55: { label: 'Dense drizzle', icon: 'fa-cloud-rain' },
  61: { label: 'Slight rain', icon: 'fa-cloud-showers-heavy' },
  63: { label: 'Rain', icon: 'fa-cloud-showers-heavy' },
  65: { label: 'Heavy rain', icon: 'fa-cloud-showers-heavy' },
  71: { label: 'Slight snow', icon: 'fa-snowflake' },
  73: { label: 'Snow', icon: 'fa-snowflake' },
  75: { label: 'Heavy snow', icon: 'fa-snowflake' },
  80: { label: 'Rain showers', icon: 'fa-cloud-showers-heavy' },
  81: { label: 'Rain showers', icon: 'fa-cloud-showers-heavy' },
  82: { label: 'Violent showers', icon: 'fa-cloud-showers-heavy' },
  95: { label: 'Thunderstorm', icon: 'fa-bolt' },
  96: { label: 'Thunderstorm + hail', icon: 'fa-bolt' },
  99: { label: 'Thunderstorm + hail', icon: 'fa-bolt' },
};

function describeWeatherCode(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: 'fa-question' };
}

/**
 * Look up latitude/longitude + display name for a free-text city query.
 * Uses Open-Meteo's free geocoding API (no key required).
 */
export async function geocodeCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No city found matching "${query}"`);
  }
  const place = data.results[0];
  return {
    name: place.name,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

/**
 * Fetch current weather for given coordinates via Open-Meteo (free, no key).
 * @param {number} latitude
 * @param {number} longitude
 * @param {'metric'|'imperial'} unit
 */
export async function fetchWeatherByCoords(latitude, longitude, unit = 'metric') {
  const tempUnit = unit === 'imperial' ? 'fahrenheit' : 'celsius';
  const windUnit = unit === 'imperial' ? 'mph' : 'kmh';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=sunrise,sunset&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  const data = await res.json();

  const current = data.current;
  const desc = describeWeatherCode(current.weather_code);

  return {
    temperature: Math.round(current.temperature_2m),
    feelsLike: Math.round(current.apparent_temperature),
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m),
    description: desc.label,
    icon: desc.icon,
    sunrise: data.daily?.sunrise?.[0] || null,
    sunset: data.daily?.sunset?.[0] || null,
    unit,
  };
}

/** Fetch weather using the browser's geolocation API, falling back to a rejected promise. */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error('Location access was denied')),
      { timeout: 8000 }
    );
  });
}

/* ==========================================================================
   Quotes
   Primary source: DummyJSON's /quotes/random endpoint — a genuinely
   random pick from 1400+ quotes on every call, no key required, and
   built specifically for frontend fetch() calls (reliable CORS support).
   Falls back to quotable.io (historically prone to downtime) as a
   secondary attempt, and only as a true last resort — e.g. no network
   at all — to a small local set, so the widget never shows a dead end.
   ========================================================================== */

const FALLBACK_QUOTES = [
  { text: 'Small steps, taken daily, outrun big plans that never start.', author: 'TaskFlow Pro' },
  { text: 'Clarity is a to-do list with only the things that matter today.', author: 'TaskFlow Pro' },
  { text: 'Progress hides in the tasks you keep postponing.', author: 'TaskFlow Pro' },
  { text: 'A calm plan beats a busy calendar.', author: 'TaskFlow Pro' },
  { text: 'Finish one thing before you start three more.', author: 'TaskFlow Pro' },
];

export async function fetchRandomQuote() {
  // Primary: DummyJSON — actively maintained, no key, reliable CORS.
  try {
    const res = await fetch('https://dummyjson.com/quotes/random');
    if (res.ok) {
      const data = await res.json();
      if (data && data.quote) {
        return { text: data.quote, author: data.author || 'Unknown' };
      }
    }
  } catch (err) {
    console.warn('DummyJSON quote request failed, trying a secondary source:', err.message);
  }

  // Secondary: quotable.io, kept as a second genuine attempt.
  try {
    const res = await fetch('https://api.quotable.io/random?maxLength=140');
    if (res.ok) {
      const data = await res.json();
      if (data && data.content) {
        return { text: data.content, author: data.author };
      }
    }
  } catch (err) {
    console.warn('Quotable request also failed:', err.message);
  }

  // Last resort only — both live sources were unreachable.
  console.warn('All quote APIs unavailable, using local fallback quote.');
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
}
