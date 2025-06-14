import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './Create.css';

const Create = ({ user }) => {
  const { t } = useTranslation();
  const [savedGifs, setSavedGifs] = useState([]);
  const [selectedGif, setSelectedGif] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create axios instance with auth header
  const authAxios = axios.create({
    headers: {
      'Authorization': `Bearer ${user?.token}`
    }
  });

  useEffect(() => {
    fetchSavedGifs();
  }, [user.email]);

  const fetchSavedGifs = async () => {
    try {
      setLoading(true);
      const response = await authAxios.get(`http://localhost:3000/gifs/user/${user.email}`);
      setSavedGifs(response.data.gifs);
    } catch (err) {
      setError('Failed to fetch saved GIFs. Please try again.');
      console.error('Error fetching saved GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGifSelect = (gif) => {
    setSelectedGif(gif);
    setCaption(gif.caption || '');
  };

  const handleCaptionChange = (e) => {
    setCaption(e.target.value);
  };

  const handleSaveCaption = async () => {
    if (!selectedGif) return;

    try {
      await authAxios.put(`http://localhost:3000/gifs/${selectedGif.id}/caption`, {
        caption
      });

      // Update local state
      setSavedGifs(gifs => 
        gifs.map(gif => 
          gif.id === selectedGif.id ? { ...gif, caption } : gif
        )
      );

      setError(null);
    } catch (err) {
      setError('Failed to save caption. Please try again.');
      console.error('Error saving caption:', err);
    }
  };

  const handleDeleteGif = async (gifId) => {
    try {
      await authAxios.delete(`http://localhost:3000/gifs/${gifId}`);
      setSavedGifs(gifs => gifs.filter(gif => gif.id !== gifId));
      if (selectedGif?.id === gifId) {
        setSelectedGif(null);
        setCaption('');
      }
      setError(null);
    } catch (err) {
      setError('Failed to delete GIF. Please try again.');
      console.error('Error deleting GIF:', err);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="create-container">
      <div className="saved-gifs">
        <h2>{t('create.savedGifs')}</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="gif-grid">
          {savedGifs.map((gif) => (
            <div 
              key={gif.id} 
              className={`gif-item ${selectedGif?.id === gif.id ? 'selected' : ''}`}
              onClick={() => handleGifSelect(gif)}
            >
              <img src={gif.preview} alt={gif.title} />
              {gif.caption && <div className="caption-preview">{gif.caption}</div>}
              <button 
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGif(gif.id);
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedGif && (
        <div className="meme-editor">
          <h2>{t('create.addCaption')}</h2>
          <div className="selected-gif">
            <img src={selectedGif.url} alt={selectedGif.title} />
            {caption && <div className="caption-overlay">{caption}</div>}
          </div>
          <textarea
            value={caption}
            onChange={handleCaptionChange}
            placeholder={t('create.enterCaption')}
            className="caption-input"
          />
          <button onClick={handleSaveCaption} className="save-button">
            {t('create.saveCaption')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Create; 