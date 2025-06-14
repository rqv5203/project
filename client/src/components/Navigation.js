import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';
import { useTranslation } from 'react-i18next';

const Navigation = () => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="navigation">
      <Link 
        to="/dashboard" 
        className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
      >
        {t('common.dashboard')}
      </Link>
      <Link 
        to="/create" 
        className={`nav-link ${location.pathname === '/create' ? 'active' : ''}`}
      >
        {t('common.create')}
      </Link>
    </nav>
  );
};

export default Navigation; 