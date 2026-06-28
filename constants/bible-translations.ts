export type BibleProviderId = 'bible-api-com' | 'api-bible';

export type ScriptureLicense = 'public-domain' | 'commercial';

export type BibleTranslation = {
  id: string;
  label: string;
  description?: string;
  language: string;
  provider: BibleProviderId;
  providerTranslationId: string;
  license: ScriptureLicense;
  autoFetch: boolean;
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
  {
    id: 'LSG',
    label: 'Louis Segond (LSG)',
    description: 'Licensed — paste verses manually for now',
    language: 'fr',
    provider: 'api-bible',
    providerTranslationId: 'a761ca71e0b3ddcf-01',
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

/** Resolves which translation to use for automatic scripture fetch. */
export function getTranslationForScriptureFetch(preferredId: string): BibleTranslation {
  const preferred = getBibleTranslation(preferredId);
  if (preferred?.autoFetch) return preferred;
  return getBibleTranslation(DEFAULT_BIBLE_TRANSLATION_ID)!;
}

export function isAutoFetchTranslation(id: string): boolean {
  return getBibleTranslation(id)?.autoFetch ?? false;
}
