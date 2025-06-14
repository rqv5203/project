import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './translations/en.json';
import esTranslations from './translations/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      es: {
        translation: esTranslations,
      },
    },
    lng: localStorage.getItem('i18nextLng') || 'en', // use stored language or default to English
    fallbackLng: 'en',
    debug: true, // enable debug mode for development
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false // prevent issues with suspense
    }
  });

// Store the selected language in localStorage when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n; 