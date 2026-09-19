import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { deviceLanguage, Language, LANGUAGES } from '@/i18n';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  languages: typeof LANGUAGES;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const KEY = 'abc_doctor_language_v1';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [language, setLanguageState] = useState<Language>(deviceLanguage());

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(value => {
      if (value === 'en' || value === 'bs' || value === 'de') {
        setLanguageState(value);
        void i18n.changeLanguage(value);
      }
    });
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    void i18n.changeLanguage(next);
    void AsyncStorage.setItem(KEY, next);
  };

  const value = useMemo(
    () => ({ language, setLanguage, t: t as LanguageContextValue['t'], languages: LANGUAGES }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
