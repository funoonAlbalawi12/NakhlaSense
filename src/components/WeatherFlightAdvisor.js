import { useEffect, useState } from "react";
import "./WeatherFlightAdvisor.css";

const WEATHER_LABELS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

function evaluateFlight({ windSpeed, precipitation, weatherCode, visibility }) {
  const reasons = [];
  let level = "safe";

  if (windSpeed >= 35) {
    level = "unsafe";
    reasons.push("High wind speed");
  } else if (windSpeed >= 25) {
    if (level !== "unsafe") level = "caution";
    reasons.push("Moderate wind speed");
  }

  if (precipitation >= 1) {
    level = "unsafe";
    reasons.push("Active rainfall");
  } else if (precipitation > 0) {
    if (level !== "unsafe") level = "caution";
    reasons.push("Light precipitation");
  }

  if ([95, 96, 99].includes(weatherCode)) {
    level = "unsafe";
    reasons.push("Thunderstorm conditions");
  }

  if (visibility < 2000) {
    level = "unsafe";
    reasons.push("Very low visibility");
  } else if (visibility < 5000) {
    if (level !== "unsafe") level = "caution";
    reasons.push("Reduced visibility");
  }

  if (!reasons.length) reasons.push("Weather conditions are stable for flight");
  return { level, reasons };
}

async function fetchWeatherForCity(targetCity) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      targetCity
    )}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();
  const place = geoData?.results?.[0];

  if (!place) {
    throw new Error("City not found. Try a more specific name.");
  }

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m,precipitation,visibility&timezone=auto`
  );
  const weatherData = await weatherRes.json();
  const current = weatherData?.current;

  if (!current) {
    throw new Error("Unable to fetch current weather data.");
  }

  const flight = evaluateFlight({
    windSpeed: current.wind_speed_10m ?? 0,
    precipitation: current.precipitation ?? 0,
    weatherCode: current.weather_code ?? 0,
    visibility: current.visibility ?? 10000,
  });

  return {
    cityLabel: `${place.name}${place.country ? `, ${place.country}` : ""}`,
    apiSource: "Open-Meteo live weather API",
    temperature: current.temperature_2m,
    windSpeed: current.wind_speed_10m,
    precipitation: current.precipitation,
    visibility: current.visibility,
    weatherCode: current.weather_code,
    weatherText: WEATHER_LABELS[current.weather_code] || "Unknown",
    time: current.time,
    flight,
  };
}

export default function WeatherFlightAdvisor({ initialCity = "Riyadh", preferredCity = "" }) {
  const normalizedInitialCity = String(initialCity || "").trim() || "Riyadh";
  const normalizedPreferredCity = String(preferredCity || "").trim();
  const [city, setCity] = useState(normalizedPreferredCity || normalizedInitialCity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState(null);

  const checkWeather = async (requestedCity = city) => {
    const targetCity = String(requestedCity || "").trim();

    if (!targetCity) return;

    setLoading(true);
    setError("");
    setWeather(null);

    try {
      setWeather(await fetchWeatherForCity(targetCity));
    } catch (fetchError) {
      setError(fetchError?.message || "Network error while fetching weather.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!normalizedPreferredCity) {
      return;
    }

    setCity(normalizedPreferredCity);
    let active = true;

    const loadPreferredCity = async () => {
      setLoading(true);
      setError("");
      setWeather(null);

      try {
        const nextWeather = await fetchWeatherForCity(normalizedPreferredCity);

        if (!active) {
          return;
        }

        setWeather(nextWeather);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        setError(fetchError?.message || "Network error while fetching weather.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPreferredCity();

    return () => {
      active = false;
    };
  }, [normalizedPreferredCity]);

  useEffect(() => {
    if (normalizedPreferredCity || !normalizedInitialCity) {
      return;
    }

    setCity(normalizedInitialCity);
    let active = true;

    const loadInitialCity = async () => {
      setLoading(true);
      setError("");
      setWeather(null);

      try {
        const nextWeather = await fetchWeatherForCity(normalizedInitialCity);

        if (!active) {
          return;
        }

        setWeather(nextWeather);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        setError(fetchError?.message || "Network error while fetching weather.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInitialCity();

    return () => {
      active = false;
    };
  }, [normalizedInitialCity, normalizedPreferredCity]);

  return (
    <div className="weather-advisor mb-5">
      <div className="weather-head">
        <h5>Drone Flight Weather Check</h5>
        <p>Check live weather and get flight suitability guidance.</p>
        {normalizedPreferredCity ? (
          <div className="weather-linked-city">
            Showing weather for the latest uploaded city: <strong>{normalizedPreferredCity}</strong>
          </div>
        ) : null}
      </div>

      <div className="weather-controls">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city (e.g., Riyadh)"
        />
        <button className="btn btn-success" onClick={() => checkWeather()} disabled={loading}>
          {loading ? "Checking..." : "Check Weather"}
        </button>
      </div>

      {error && <div className="weather-error">{error}</div>}

      {weather && (
        <div className="weather-result">
          <div className="weather-top">
            <div>
              <strong>{weather.cityLabel}</strong>
              <div className="weather-time">Observed: {new Date(weather.time).toLocaleString()}</div>
              <div className="weather-source">Source: {weather.apiSource}</div>
            </div>
            <span className={`flight-badge ${weather.flight.level}`}>
              {weather.flight.level === "safe"
                ? "Safe to Fly"
                : weather.flight.level === "caution"
                ? "Fly With Caution"
                : "Do Not Fly"}
            </span>
          </div>

          <div className="weather-grid">
            <div><span>Condition</span><strong>{weather.weatherText}</strong></div>
            <div><span>Temperature</span><strong>{weather.temperature} C</strong></div>
            <div><span>Wind Speed</span><strong>{weather.windSpeed} km/h</strong></div>
            <div><span>Precipitation</span><strong>{weather.precipitation} mm</strong></div>
            <div><span>Visibility</span><strong>{Math.round(weather.visibility)} m</strong></div>
          </div>

          <div className="weather-reasons">
            {weather.flight.reasons.map((reason) => (
              <div key={reason} className="reason-item">
                {reason}
              </div>
            ))}
          </div>

          <div className="weather-guidance">
            {weather.flight.level === "safe"
              ? "Current conditions support drone flights."
              : weather.flight.level === "caution"
              ? "Flights may proceed only with extra caution and operator review."
              : "Current conditions are not safe for drone flights."}
          </div>
        </div>
      )}
    </div>
  );
}
