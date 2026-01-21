'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Locale, TranslationKey, getTranslation } from './translations';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  localize: (pt: string, en?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
const STORAGE_KEY = 'smartfinance_locale';

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('pt');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'pt' || stored === 'en') {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
  }, [locale, setLocale, toggleLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((current) => (current === 'pt' ? 'en' : 'pt'));
  }, [setLocale]);

  const value = useMemo(() => {
    const localize = (ptText: string, enText?: string) => {
      if (locale === 'pt') return ptText;
      return enText ?? ptText;
    };

    return {
      locale,
      setLocale,
      toggleLocale,
      localize,
    };
  }, [locale, setLocale, toggleLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

export const useTranslation = () => {
  const { locale, toggleLocale, localize } = useLocale();

  const t = (key: TranslationKey) => getTranslation(locale, key);

  return {
    locale,
    toggleLocale,
    localize,
    t,
  };
};
