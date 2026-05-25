import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uzJson from './messages/uz.json';
import ruJson from './messages/ru.json';
import enJson from './messages/en.json';

const resources = {
  uz: {
    translation: uzJson,
  },
  ru: {
    translation: ruJson,
  },
  en: {
    translation: enJson,
  },
};

const savedLanguage = localStorage.getItem('i18nextLng') || 'uz';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'uz',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
