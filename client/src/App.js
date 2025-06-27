import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import Create from './components/Create';
import LanguageToggle from './components/LanguageToggle';

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(() => {
    // Initialize user state from localStorage if it exists
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const getApiBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      return window.location.origin;
    }
    return 'https://project-app-433167393412.us-central1.run.app' || 'http://localhost:3000';
  };

  useEffect(() => {
    // Check URL parameters for authentication response
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const userData = JSON.parse(decodeURIComponent(params.get('user')));
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function googleAuth() {
    const response = await fetch(`${getApiBaseUrl()}/request`, {
      method: 'post'
    });
    const data = await response.json();
    window.location.href = data.url;
  }

  async function linkedinAuth() {
    const response = await fetch(`${getApiBaseUrl()}/auth/linkedin/request`, {
      method: 'post'
    });
    const data = await response.json();
    window.location.href = data.url;
  }

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('user'); // Clear user data from localStorage
  };

  return (
    <Router>
      <LanguageToggle />
      {user && (
        <>
          <Navigation />
        </>
      )}
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <div className="auth-container">
                <h1>{t('common.signIn')}</h1>
                <div className="auth-buttons">
                  <button type="button" onClick={googleAuth}>
                    {t('common.signInWithGoogle')}
                  </button>
                  <button type="button" onClick={linkedinAuth}>
                    {t('common.signInWithLinkedIn')}
                  </button>
                </div>
              </div>
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onSignOut={handleSignOut} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/create"
          element={
            user ? (
              <Create user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
