import {
  DEFAULT_APP_LOCALE,
  getDefaultBibleTranslationId,
  type AppLocale,
} from '@/constants/languages';

export type BibleProviderId = 'bible-api-com' | 'api-bible' | 'bible-data';

export type ScriptureLicense = 'public-domain' | 'commercial';

export type BibleTranslation = {
  id: string;
  label: string;
  description?: string;
  language: AppLocale | string;
  provider: BibleProviderId;
  providerTranslationId: string;
  license: ScriptureLicense;
  autoFetch: boolean;
  attribution?: string;
};

/** Translations available for automatic verse lookup (free, public domain). */
export const AUTO_FETCH_BIBLE_TRANSLATIONS: BibleTranslation[] = [
  {
    id: 'WEB',
    label: 'World English Bible (WEB)',
    description: 'Modern English — public domain',
    language: 'en',
    provider: 'bible-api-com',
    providerTranslationId: 'web',
    license: 'public-domain',
    autoFetch: true,
  },
  {
    id: 'KJV',
    label: 'King James Version (KJV)',
    description: 'Classic English — public domain',
    language: 'en',
    provider: 'bible-api-com',
    providerTranslationId: 'kjv',
    license: 'public-domain',
    autoFetch: true,
  },
  {
    id: 'ASV',
    label: 'American Standard Version (ASV)',
    description: 'Public domain',
    language: 'en',
    provider: 'bible-api-com',
    providerTranslationId: 'asv',
    license: 'public-domain',
    autoFetch: true,
  },
  {
    id: 'LSG1910',
    label: 'Louis Segond 1910 (LSG)',
    description: 'Français — domaine public (eBible / midvash bible-data)',
    language: 'fr',
    provider: 'bible-data',
    providerTranslationId: 'lsg',
    license: 'public-domain',
    autoFetch: true,
    attribution: 'Louis Segond 1910 — public domain. Source: eBible.org (fraLSG).',
  },
  {
    id: 'RV1909',
    label: 'Reina-Valera 1909 (RV1909)',
    description: 'Español — dominio público',
    language: 'es',
    provider: 'bible-api-com',
    providerTranslationId: 'rv1909',
    license: 'public-domain',
    autoFetch: true,
    attribution: 'Reina-Valera 1909 — public domain.',
  },
];

/** Licensed translations — manual verse entry only until API.Bible is configured. */
export const LICENSED_BIBLE_TRANSLATIONS: BibleTranslation[] = [
  {
    id: 'NIV',
    label: 'New International Version (NIV)',
    description: 'Licensed — paste verses manually for now',
    language: 'en',
    provider: 'api-bible',
    providerTranslationId: '9879dbb37efb29-04',
    license: 'commercial',
    autoFetch: false,
  },
  {
    id: 'ESV',
    label: 'English Standard Version (ESV)',
    description: 'Licensed — paste verses manually for now',
    language: 'en',
    provider: 'api-bible',
    providerTranslationId: '214377fb1782388-01',
    license: 'commercial',
    autoFetch: false,
  },
  {
    id: 'CSB',
    label: 'Christian Standard Bible (CSB)',
    description: 'Licensed — paste verses manually for now',
    language: 'en',
    provider: 'api-bible',
    providerTranslationId: '6614b0b05011c8b8-01',
    license: 'commercial',
    autoFetch: false,
  },
];

export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  ...AUTO_FETCH_BIBLE_TRANSLATIONS,
  ...LICENSED_BIBLE_TRANSLATIONS,
];

export const DEFAULT_BIBLE_TRANSLATION_ID = 'WEB';

export function getBibleTranslation(id: string): BibleTranslation | undefined {
  return BIBLE_TRANSLATIONS.find((t) => t.id === id);
}

export function getAutoFetchTranslationsForLocale(locale: AppLocale | string): BibleTranslation[] {
  const language = (locale || DEFAULT_APP_LOCALE).toString().split(/[-_]/)[0];
  return AUTO_FETCH_BIBLE_TRANSLATIONS.filter((t) => t.language === language);
}

/** Resolves which translation to use for automatic scripture fetch. */
export function getTranslationForScriptureFetch(
  preferredId: string,
  locale?: AppLocale | string,
): BibleTranslation {
  const preferred = getBibleTranslation(preferredId);
  if (preferred?.autoFetch) {
    if (!locale || preferred.language === locale.toString().split(/[-_]/)[0]) {
      return preferred;
    }
  }

  if (locale) {
    const defaults = getAutoFetchTranslationsForLocale(locale);
    if (defaults[0]) return defaults[0];
  }

  return getBibleTranslation(DEFAULT_BIBLE_TRANSLATION_ID)!;
}

export function isAutoFetchTranslation(id: string): boolean {
  return getBibleTranslation(id)?.autoFetch ?? false;
}

export function translationMatchesLocale(
  translationId: string,
  locale: AppLocale | string,
): boolean {
  const translation = getBibleTranslation(translationId);
  if (!translation) return false;
  return translation.language === locale.toString().split(/[-_]/)[0];
}

/**
 * If the current Bible preference is incompatible with the new app language,
 * return the default translation for that language.
 */
export function resolveBibleTranslationForLocaleChange(
  currentTranslationId: string | null | undefined,
  locale: AppLocale,
): { translationId: string; changed: boolean } {
  const current = currentTranslationId ?? '';
  if (current && translationMatchesLocale(current, locale) && isAutoFetchTranslation(current)) {
    return { translationId: current, changed: false };
  }
  return { translationId: getDefaultBibleTranslationId(locale), changed: true };
}

/** Short attribution line for UI (e.g. "WEB · World English Bible (public domain)"). */
export function formatScriptureAttribution(translationId: string | null | undefined): string {
  if (!translationId) return 'Scripture';
  const translation = getBibleTranslation(translationId);
  if (!translation) return translationId;
  if (translation.license === 'public-domain') {
    return `${translation.id} · ${translation.label.replace(` (${translation.id})`, '')} (public domain)`;
  }
  return `${translation.id} · ${translation.label.replace(` (${translation.id})`, '')}`;
}
