import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GiphySearch from './GiphySearch';
import './Dashboard.css';

function Dashboard({ user, onSignOut }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = () => {
    onSignOut();
    navigate('/');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          {user?.picture && (
            <img 
              src={user.picture} 
              alt={t('common.profile')} 
              className="profile-picture"
            />
          )}
          <div className="user-details">
            <h1>{t('common.welcome')}, {user?.name}!</h1>
            <p>{t('common.email')}: {user?.email}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="sign-out-button">
          {t('common.signOut')}
        </button>
      </div>
      
      <div className="dashboard-content">
        <h2>{t('dashboard.searchAndShare')}</h2>
        <GiphySearch user={user} />
      </div>
    </div>
  );
}

export default Dashboard; 