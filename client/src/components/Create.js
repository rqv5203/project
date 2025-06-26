import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './Create.css';

const Create = ({ user }) => {
  const { t } = useTranslation();
  const [weatherCollections, setWeatherCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create axios instance with auth header
  const authAxios = axios.create({
    headers: {
      'Authorization': `Bearer ${user?.token}`
    }
  });

  useEffect(() => {
    fetchWeatherCollections();
  }, [user.email]);

  const fetchWeatherCollections = async () => {
    try {
      setLoading(true);
      const response = await authAxios.get(`http://localhost:3000/weather/user/${user.email}`);
      setWeatherCollections(response.data.collections);
    } catch (err) {
      setError('Failed to fetch weather collections. Please try again.');
      //console.error('Error fetching weather collections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setTitle(collection.title || '');
    setSelectedDate(null);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleSaveTitle = async () => {
    if (!selectedCollection) return;

    try {
      await authAxios.put(`http://localhost:3000/weather/${selectedCollection.id}/title`, {
        title
      });

      // Update local state
      setWeatherCollections(collections => 
        collections.map(collection => 
          collection.id === selectedCollection.id ? { ...collection, title } : collection
        )
      );

      setSelectedCollection(prev => ({ ...prev, title }));
      setError(null);
    } catch (err) {
      setError('Failed to save title. Please try again.');
      //console.error('Error saving title:', err);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    try {
      await authAxios.delete(`http://localhost:3000/weather/${collectionId}`);
      setWeatherCollections(collections => collections.filter(collection => collection.id !== collectionId));
      if (selectedCollection?.id === collectionId) {
        setSelectedCollection(null);
        setTitle('');
      }
      setError(null);
    } catch (err) {
      setError('Failed to delete collection. Please try again.');
      //console.error('Error deleting collection:', err);
    }
  };

  const handlePhotoUpload = async (e) => {
    if (!selectedCollection || !selectedDate) return;

    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await authAxios.post(
        `http://localhost:3000/weather/${selectedCollection.id}/photo/${selectedDate}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Update local state
      setSelectedCollection(prev => ({
        ...prev,
        photos: {
          ...prev.photos,
          [selectedDate]: response.data.photoUrl
        }
      }));

      setError(null);
    } catch (err) {
      setError('Failed to upload photo. Please try again.');
      //console.error('Error uploading photo:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
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

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="create-container">
      <div className="weather-collections">
        <h2>Saved Weather Collections</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="collections-grid">
          {weatherCollections.map((collection) => (
            <div 
              key={collection.id} 
              className={`collection-item ${selectedCollection?.id === collection.id ? 'selected' : ''}`}
              onClick={() => handleCollectionSelect(collection)}
            >
              <div className="collection-info">
                <h3>{collection.title}</h3>
                <p>{collection.location}</p>
                <p>{formatDate(collection.startDate)} - {formatDate(collection.endDate)}</p>
              </div>
              <button 
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCollection(collection.id);
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedCollection && (
        <div className="collection-editor">
          <div className="collection-header">
            <h2>Edit Collection</h2>
            <div className="title-editor">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Collection title"
                className="title-input"
              />
              <button onClick={handleSaveTitle} className="save-button">
                Save Title
              </button>
            </div>
          </div>

          <div className="weather-days">
            <h3>Weather Days</h3>
            <div className="days-grid">
              {selectedCollection.weatherData?.daily?.time?.map((date, index) => (
                <div 
                  key={date} 
                  className={`day-item ${selectedDate === date ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="day-date">{formatDate(date)}</div>
                  <div className="day-weather">
                    {getWeatherDescription(selectedCollection.weatherData.daily.weather_code[index])}
                  </div>
                  <div className="day-temps">
                    <span className="high">{Math.round(selectedCollection.weatherData.daily.temperature_2m_max[index])}°</span>
                    <span className="low">{Math.round(selectedCollection.weatherData.daily.temperature_2m_min[index])}°</span>
                  </div>
                  {selectedCollection.photos?.[date] && (
                    <img 
                      src={`http://localhost:3000${selectedCollection.photos[date]}`} 
                      alt={`Weather on ${date}`}
                      className="day-photo"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="photo-upload">
              <h3>Add Photo for {formatDate(selectedDate)}</h3>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="photo-input"
              />
              {selectedCollection.photos?.[selectedDate] && (
                <div className="current-photo">
                  <h4>Current Photo:</h4>
                  <img 
                    src={`http://localhost:3000${selectedCollection.photos[selectedDate]}`} 
                    alt={`Weather on ${selectedDate}`}
                    className="preview-photo"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Create; 