import type { ScriptureFetchResult, ScriptureProvider, TranslationConfig } from '../catalog.ts';

const BASE_URL = 'https://bible-api.com';

export class BibleApiComProvider implements ScriptureProvider {
  id = 'bible-api-com';

  async fetchPassage(
    reference: string,
    translation: TranslationConfig,
  ): Promise<ScriptureFetchResult> {
    const path = encodeURIComponent(reference.trim());
    const url = `${BASE_URL}/${path}?translation=${translation.providerTranslationId}`;

    const response = await fetch(url);

    if (!response.ok) {
      const detail = await response.text();
      console.error('bible-api.com failed:', response.status, detail);
      throw new Error(
        'Could not fetch verse. Check the reference format (e.g. John 3:16 or Philippians 4:6-7).',
      );
    }

    const json = await response.json();
    const text = typeof json.text === 'string' ? json.text.trim() : '';

    if (!text) {
      throw new Error(
        `No verse found for "${reference}". Try a format like John 3:16 or Philippians 4:6-7.`,
      );
    }

    return {
      reference: json.reference ?? reference,
      text,
      translation_id: translation.id,
      provider: this.id,
    };
  }
}
