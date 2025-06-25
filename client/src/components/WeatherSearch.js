import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WeatherSearch.css';
import { useTranslation } from 'react-i18next';

const WeatherSearch = ({ user }) => {
  const [location, setLocation] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempUnit, setTempUnit] = useState('celsius'); // 'celsius' or 'fahrenheit'
  const { t } = useTranslation();

  // Open-Meteo API base URL
  const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
  const HISTORICAL_API_URL = 'https://archive-api.open-meteo.com/v1/archive';
  const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

  const convertTemp = (temp) => {
    if (tempUnit === 'fahrenheit') {
      return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
  };

  const toggleTempUnit = () => {
    setTempUnit(prev => prev === 'celsius' ? 'fahrenheit' : 'celsius');
  };

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
    setHistoricalData(null);

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

  const fetchHistoricalData = async (latitude, longitude) => {
    if (!startDate || !endDate) return;
    
    try {
      const historicalResponse = await axios.get(HISTORICAL_API_URL, {
        params: {
          latitude: latitude,
          longitude: longitude,
          start_date: startDate,
          end_date: endDate,
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'wind_speed_10m_max'
          ].join(','),
          timezone: 'auto'
        }
      });

      console.log(latitude, longitude);
      console.log(startDate, endDate);
      console.log(historicalResponse.data);

      setHistoricalData(historicalResponse.data);
    } catch (err) {
      setError('Failed to fetch historical weather data. Please try again.');
      console.error('Error fetching historical weather:', err);
    }
  };

  const saveWeatherCollection = async () => {
    if (!historicalData || !user?.token) return;
    
    try {
      const collectionData = {
        title: `Weather Collection ${formatDate(startDate)} - ${formatDate(endDate)}`,
        startDate: startDate,
        endDate: endDate,
        location: weatherData.locationName,
        weatherData: historicalData
      };

      const authAxios = axios.create({
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      await authAxios.post('http://localhost:3000/weather/save', collectionData);
      setError(null);
      alert('Weather collection saved successfully!');
    } catch (err) {
      setError('Failed to save weather collection. Please try again.');
      console.error('Error saving weather collection:', err);
    }
  };

  const handleDateRangeSubmit = async (e) => {
    e.preventDefault();
    if (!weatherData || !startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      await fetchHistoricalData(
        weatherData.latitude,
        weatherData.longitude
      );
    } catch (err) {
      setError('Failed to fetch historical data. Please try again.');
    } finally {
      setLoading(false);
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
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
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
        <button 
          onClick={toggleTempUnit}
          className="temp-unit-toggle"
          type="button"
        >
          {tempUnit === 'celsius' ? '°C → °F' : '°F → °C'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading weather data...</div>
      ) : weatherData ? (
        <div className="weather-container">
          <div className="current-weather">
            <h2>{weatherData.locationName}</h2>
            <div className="current-temp">
              <span className="temperature">
                {convertTemp(weatherData.current.temperature_2m)}°{tempUnit === 'celsius' ? 'C' : 'F'}
              </span>
              <span className="feels-like">
                {t('weather.feelsLike')} {convertTemp(weatherData.current.apparent_temperature)}°{tempUnit === 'celsius' ? 'C' : 'F'}
              </span>
            </div>
            <div className="weather-description">
              {getWeatherDescription(weatherData.current.weather_code)}
            </div>
            <div className="weather-details">
              <div className="detail-item">
                <span className="label">{t('weather.humidity')}:</span>
                <span className="value">{weatherData.current.relative_humidity_2m}%</span>
              </div>
              <div className="detail-item">
                <span className="label">{t('weather.wind')}:</span>
                <span className="value">{Math.round(weatherData.current.wind_speed_10m)} km/h</span>
              </div>
              <div className="detail-item">
                <span className="label">{t('weather.cloudCover')}:</span>
                <span className="value">{weatherData.current.cloud_cover}%</span>
              </div>
              {weatherData.current.precipitation > 0 && (
                <div className="detail-item">
                  <span className="label">{t('weather.precipitation')}:</span>
                  <span className="value">{weatherData.current.precipitation} mm</span>
                </div>
              )}
            </div>
          </div>

          <div className="forecast">
            <h3>{t('weather.sevenDayForecast')}</h3>
            <div className="forecast-grid">
              {weatherData.daily.time.map((date, index) => (
                <div key={date} className="forecast-item">
                  <div className="forecast-date">{formatDate(date)}</div>
                  <div className="forecast-weather">
                    {getWeatherDescription(weatherData.daily.weather_code[index])}
                  </div>
                  <div className="forecast-temps">
                    <span className="high">{convertTemp(weatherData.daily.temperature_2m_max[index])}°</span>
                    <span className="low">{convertTemp(weatherData.daily.temperature_2m_min[index])}°</span>
                  </div>
                  {weatherData.daily.precipitation_sum[index] > 0 && (
                    <div className="forecast-rain">
                      {weatherData.daily.precipitation_sum[index].toFixed(1)} mm
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="historical-weather">
              <h3>{t('weather.historicalData')}</h3>
              <form onSubmit={handleDateRangeSubmit} className="date-range-form">
                <div className="date-inputs">
                  <div className="date-input-group">
                    <label htmlFor="start-date">{t('weather.startDate')}</label>
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="date-input-group">
                    <label htmlFor="end-date">{t('weather.endDate')}</label>
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      min={startDate}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="fetch-historical-button">
                  {t('weather.fetchHistorical')}
                </button>
              </form>

              {historicalData && (
                <div className="historical-data-container">
                  <div className="historical-data-header">
                    <h4>Historical Weather Data</h4>
                    {user?.token && (
                      <button 
                        onClick={saveWeatherCollection}
                        className="save-collection-button"
                        type="button"
                      >
                        Save Collection
                      </button>
                    )}
                  </div>
                  <div className="historical-data-grid">
                    {historicalData.daily.time.map((date, index) => (
                      <div key={date} className="historical-item">
                        <div className="historical-date">{formatDate(date)}</div>
                        <div className="historical-weather">
                          {getWeatherDescription(historicalData.daily.weather_code[index])}
                        </div>
                        <div className="historical-temps">
                          <span className="high">{convertTemp(historicalData.daily.temperature_2m_max[index])}°</span>
                          <span className="low">{convertTemp(historicalData.daily.temperature_2m_min[index])}°</span>
                        </div>
                        {historicalData.daily.precipitation_sum[index] > 0 && (
                          <div className="historical-rain">
                            {historicalData.daily.precipitation_sum[index].toFixed(1)} mm
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeatherSearch; 