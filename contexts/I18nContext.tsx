import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { TranslateOptions } from 'i18n-js';

import {
  DEFAULT_APP_LOCALE,
  LANGUAGE_OPTIONS,
  normalizeAppLocale,
  type AppLocale,
  type LanguageOption,
} from '@/constants/languages';
import { useAuth } from '@/contexts/AuthContext';
import { getDeviceLocale, setAppLocale, t as translate } from '@/lib/i18n';

type I18nContextValue = {
  locale: AppLocale;
  options: LanguageOption[];
  t: (key: string, options?: TranslateOptions) => string;
  /**
   * Preview a language before it is saved to the profile
   * (signup / onboarding). Cleared once a profile locale exists.
   */
  setGuestLocale: (locale: AppLocale) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: PropsWithChildren) {
  const { profile, session } = useAuth();
  const [guestLocale, setGuestLocaleState] = useState<AppLocale>(getDeviceLocale);

  const locale = useMemo(() => {
    if (profile?.locale) return normalizeAppLocale(profile.locale);
    if (!session) return guestLocale;
    return DEFAULT_APP_LOCALE;
  }, [profile?.locale, session, guestLocale]);

  useEffect(() => {
    setAppLocale(locale);
  }, [locale]);

  const setGuestLocale = useCallback((next: AppLocale) => {
    setGuestLocaleState(next);
    setAppLocale(next);
  }, []);

  const t = useCallback(
    (key: string, options?: TranslateOptions) => translate(key, options),
    // Re-create when locale changes so screens re-render with new copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      options: LANGUAGE_OPTIONS,
      t,
      setGuestLocale,
    }),
    [locale, t, setGuestLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
