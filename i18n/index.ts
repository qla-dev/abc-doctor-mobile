import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import bs from './locales/bs.json';
import de from './locales/de.json';

export type Language = 'en' | 'bs' | 'de';

/** Only registered languages ship. A catalog on disk is a candidate, not a product language. */
export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

const SUPPORTED = LANGUAGES.map(l => l.code);

/** The device locale, but only when we actually ship it; otherwise English. */
export function deviceLanguage(): Language {
  const tag = getLocales()[0]?.languageCode ?? 'en';
  // Serbian and Croatian speakers read Bosnian without friction; they are not shipped separately yet.
  const aliased = tag === 'hr' || tag === 'sr' ? 'bs' : tag;
  return (SUPPORTED as string[]).includes(aliased) ? (aliased as Language) : 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bs: { translation: bs }, de: { translation: de } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  // A missing Bosnian string falls back to English rather than rendering a raw key at a student.
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export default i18n;
