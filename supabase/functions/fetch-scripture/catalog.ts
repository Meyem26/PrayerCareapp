export type ScriptureFetchResult = {
  reference: string;
  text: string;
  translation_id: string;
  provider: string;
};

export type TranslationConfig = {
  id: string;
  provider: 'bible-api-com' | 'api-bible';
  providerTranslationId: string;
  autoFetch: boolean;
};

export interface ScriptureProvider {
  id: string;
  fetchPassage(reference: string, translation: TranslationConfig): Promise<ScriptureFetchResult>;
}

export const TRANSLATION_CATALOG: TranslationConfig[] = [
  { id: 'WEB', provider: 'bible-api-com', providerTranslationId: 'web', autoFetch: true },
  { id: 'KJV', provider: 'bible-api-com', providerTranslationId: 'kjv', autoFetch: true },
  { id: 'ASV', provider: 'bible-api-com', providerTranslationId: 'asv', autoFetch: true },
  { id: 'NIV', provider: 'api-bible', providerTranslationId: '9879dbb37efb29-04', autoFetch: false },
  { id: 'ESV', provider: 'api-bible', providerTranslationId: '214377fb1782388-01', autoFetch: false },
  { id: 'CSB', provider: 'api-bible', providerTranslationId: '6614b0b05011c8b8-01', autoFetch: false },
  { id: 'LSG', provider: 'api-bible', providerTranslationId: 'a761ca71e0b3ddcf-01', autoFetch: false },
];

export const DEFAULT_TRANSLATION_ID = 'WEB';

export function getTranslationConfig(id: string): TranslationConfig | undefined {
  return TRANSLATION_CATALOG.find((t) => t.id === id);
}

export function resolveTranslationForFetch(preferredId: string): TranslationConfig {
  const preferred = getTranslationConfig(preferredId);
  if (preferred?.autoFetch) return preferred;
  return getTranslationConfig(DEFAULT_TRANSLATION_ID)!;
}

export function normalizeReference(reference: string): string {
  return reference.trim().replace(/\s+/g, ' ').toLowerCase();
}
