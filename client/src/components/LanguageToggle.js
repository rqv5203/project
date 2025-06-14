import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageToggle = () => {
  const { t, i18n } = useTranslation();

  const toggleLanguage = useCallback(() => {
    try {
      const newLanguage = i18n.language.startsWith('en') ? 'es' : 'en';
      console.log('Changing language to:', newLanguage);
      i18n.changeLanguage(newLanguage);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, [i18n]);

  return (
    <div className="language-toggle">
      <button 
        className="language-button"
        onClick={toggleLanguage}
        title={`Switch to ${i18n.language.startsWith('en') ? 'Spanish' : 'English'}`}
      >
        {t('common.language')}: {i18n.language.startsWith('en') ? t('common.english') : t('common.spanish')}
      </button>
    </div>
  );
};

export default LanguageToggle; 