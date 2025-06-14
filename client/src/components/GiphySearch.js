import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GiphySearch.css';
import { useTranslation } from 'react-i18next';

const GiphySearch = ({ user }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedGifs, setSavedGifs] = useState(new Set());
  const { t } = useTranslation();

  //const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_KEY;
  //console.log('Giphy API Key:', GIPHY_API_KEY);
  const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs/search';

  // Create axios instance with auth header
  const authAxios = axios.create({
    headers: {
      'Authorization': `Bearer ${user?.token}`
    }
  });

  // Debug log for user data
  useEffect(() => {
    console.log('Current user data:', user);
    console.log('Auth token:', user?.token);
  }, [user]);

  // Fetch user's saved GIFs on component mount
  useEffect(() => {
    if (user?.email && user?.token) {
      fetchSavedGifs();
    }
  }, [user?.email, user?.token]);

  const fetchSavedGifs = async () => {
    try {
      console.log('Fetching saved GIFs with token:', user?.token);
      const response = await authAxios.get(`http://localhost:3000/gifs/user/${user.email}`);
      const savedGifIds = new Set(response.data.gifs.map(gif => gif.id));
      setSavedGifs(savedGifIds);
    } catch (err) {
      console.error('Error fetching saved GIFs:', err.response || err);
      setError('Failed to fetch saved GIFs. Please try again.');
    }
  };

  const searchGifs = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(GIPHY_API_URL, {
        params: {
          api_key: process.env.REACT_APP_GIPHY_KEY,
          q: search,
          limit: 20,
          rating: 'g'
        }
      });

      setGifs(response.data.data);
    } catch (err) {
      setError('Failed to fetch GIFs. Please try again.');
      console.error('Error fetching GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGif = async (gif) => {
    try {
      console.log('Saving GIF with token:', user?.token);
      const gifData = {
        id: gif.id,
        title: gif.title,
        url: gif.images.original.url,
        preview: gif.images.fixed_height.url,
        tags: []
      };

      await authAxios.post('http://localhost:3000/gifs/save', gifData);
      setSavedGifs(prev => new Set([...prev, gif.id]));
    } catch (err) {
      console.error('Error saving GIF:', err.response || err);
      setError('Failed to save GIF. Please try again.');
    }
  };

  const handleRemoveGif = async (gifId) => {
    try {
      console.log('Removing GIF with token:', user?.token);
      await authAxios.delete(`http://localhost:3000/gifs/${gifId}`);
      setSavedGifs(prev => {
        const newSet = new Set(prev);
        newSet.delete(gifId);
        return newSet;
      });
    } catch (err) {
      console.error('Error removing GIF:', err.response || err);
      setError('Failed to remove GIF. Please try again.');
    }
  };

  return (
    <div className="giphy-search">
      <form onSubmit={searchGifs} className="search-form">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for GIFs..."
          className="search-input"
        />
        <button type="submit" className="search-button">
          {t('common.search')}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="gif-grid">
          {gifs.map((gif) => (
            <div key={gif.id} className="gif-item">
              <img
                src={gif.images.fixed_height.url}
                alt={gif.title}
                loading="lazy"
              />
              <div className="gif-actions">
                {savedGifs.has(gif.id) ? (
                  <button 
                    onClick={() => handleRemoveGif(gif.id)}
                    className="remove-button"
                  >
                    {t('common.remove')}
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSaveGif(gif)}
                    className="save-button"
                  >
                    {t('common.save')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GiphySearch; 