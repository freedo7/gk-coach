import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import it from './it';
import en from './en';

const LANGUAGE_KEY = '@gk_language';

const deviceLang = getLocales()[0]?.languageCode ?? 'it';

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: deviceLang.startsWith('it') ? 'it' : 'en',
  fallbackLng: 'it',
  interpolation: {
    escapeValue: false,
  },
});

// Load saved language preference
AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
  if (saved && saved !== i18n.language) {
    i18n.changeLanguage(saved);
  }
});

export async function setLanguage(lang: string) {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
