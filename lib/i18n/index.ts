import { getLocales } from 'expo-localization';
import { I18n, type TranslateOptions } from 'i18n-js';

import {
  DEFAULT_APP_LOCALE,
  normalizeAppLocale,
  type AppLocale,
} from '@/constants/languages';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';

export const i18n = new I18n({
  en,
  fr,
  es,
});

i18n.defaultLocale = DEFAULT_APP_LOCALE;
i18n.enableFallback = true;
i18n.locale = DEFAULT_APP_LOCALE;

export function getDeviceLocale(): AppLocale {
  const deviceTag = getLocales()[0]?.languageCode ?? DEFAULT_APP_LOCALE;
  return normalizeAppLocale(deviceTag);
}

export function setAppLocale(locale: AppLocale) {
  i18n.locale = locale;
}

export function t(key: string, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

export function translateCategorySlug(slug: string | null | undefined, fallback?: string | null): string {
  if (!slug) return fallback ?? '';
  const key = `categories.${slug}`;
  const translated = i18n.t(key);
  if (translated === key || translated.startsWith('[missing')) {
    return fallback ?? slug;
  }
  return translated;
}
