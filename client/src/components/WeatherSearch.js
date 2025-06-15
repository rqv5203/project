import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WeatherSearch.css';
import { useTranslation } from 'react-i18next';

const WeatherSearch = ({ user }) => {
  const [location, setLocation] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const { t } = useTranslation();

  // Open-Meteo API base URL
  const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
  const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          const locationName = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          fetchWeatherByCoords(latitude, longitude, locationName);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your current location. Please search for a location manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  const searchLocation = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // First, geocode the location to get coordinates
      const geocodeResponse = await axios.get(GEOCODING_API_URL, {
        params: {
          name: location,
          count: 1,
          language: 'en',
          format: 'json'
        }
      });

      if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
        const result = geocodeResponse.data.results[0];
        const locationName = `${result.name} (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)})`;
        await fetchWeatherByCoords(result.latitude, result.longitude, locationName);
      } else {
        setError('Location not found. Please try a different search term.');
      }
    } catch (err) {
      setError('Failed to search for location. Please try again.');
      console.error('Error searching location:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (latitude, longitude, locationName) => {
    try {
      const weatherResponse = await axios.get(WEATHER_API_URL, {
        params: {
          latitude: latitude,
          longitude: longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'weather_code',
            'cloud_cover',
            'wind_speed_10m',
            'wind_direction_10m'
          ].join(','),
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'wind_speed_10m_max'
          ].join(','),
          timezone: 'auto',
          forecast_days: 7
        }
      });

      setWeatherData({
        ...weatherResponse.data,
        locationName: locationName || `${latitude}, ${longitude}`
      });
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
      console.error('Error fetching weather:', err);
    }
  };

  const getWeatherDescription = (weatherCode) => {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[weatherCode] || 'Unknown';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCurrentLocation = () => {
    if (currentLocation) {
      setLoading(true);
      setError(null);
      const locationName = `Current Location (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`;
      fetchWeatherByCoords(currentLocation.latitude, currentLocation.longitude, locationName);
      setLoading(false);
    }
  };

  return (
    <div className="weather-search">
      <div className="search-controls">
        <form onSubmit={searchLocation} className="search-form">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Search for a location..."
            className="search-input"
          />
          <button type="submit" className="search-button">
            {t('common.search')}
          </button>
        </form>
        {currentLocation && (
          <button 
            onClick={handleCurrentLocation}
            className="current-location-button"
            type="button"
          >
            📍 Current Location
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading weather data...</div>
      ) : weatherData ? (
        <div className="weather-container">
          <div className="current-weather">
            <h2>{weatherData.locationName}</h2>
            <div className="current-temp">
              <span className="temperature">{Math.round(weatherData.current.temperature_2m)}°C</span>
              <span className="feels-like">
                Feels like {Math.round(weatherData.current.apparent_temperature)}°C
              </span>
            </div>
            <div className="weather-description">
              {getWeatherDescription(weatherData.current.weather_code)}
            </div>
            <div className="weather-details">
              <div className="detail-item">
                <span className="label">Humidity:</span>
                <span className="value">{weatherData.current.relative_humidity_2m}%</span>
              </div>
              <div className="detail-item">
                <span className="label">Wind:</span>
                <span className="value">{Math.round(weatherData.current.wind_speed_10m)} km/h</span>
              </div>
              <div className="detail-item">
                <span className="label">Cloud Cover:</span>
                <span className="value">{weatherData.current.cloud_cover}%</span>
              </div>
              {weatherData.current.precipitation > 0 && (
                <div className="detail-item">
                  <span className="label">Precipitation:</span>
                  <span className="value">{weatherData.current.precipitation} mm</span>
                </div>
              )}
            </div>
          </div>

          <div className="forecast">
            <h3>7-Day Forecast</h3>
            <div className="forecast-grid">
              {weatherData.daily.time.map((date, index) => (
                <div key={date} className="forecast-item">
                  <div className="forecast-date">{formatDate(date)}</div>
                  <div className="forecast-weather">
                    {getWeatherDescription(weatherData.daily.weather_code[index])}
                  </div>
                  <div className="forecast-temps">
                    <span className="high">{Math.round(weatherData.daily.temperature_2m_max[index])}°</span>
                    <span className="low">{Math.round(weatherData.daily.temperature_2m_min[index])}°</span>
                  </div>
                  {weatherData.daily.precipitation_sum[index] > 0 && (
                    <div className="forecast-rain">
                      {weatherData.daily.precipitation_sum[index].toFixed(1)} mm
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeatherSearch; 