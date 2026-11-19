import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from './locales/id';
import en from './locales/en';
import { useSettings } from '@/store/settings';

export const resources = {
  id: { translation: id },
  en: { translation: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: useSettings.getState().lang,
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// keep i18next + <html lang> in sync with the persisted setting
useSettings.subscribe((s, prev) => {
  if (s.lang !== prev.lang) {
    void i18n.changeLanguage(s.lang);
    document.documentElement.setAttribute('lang', s.lang);
  }
});

export default i18n;
