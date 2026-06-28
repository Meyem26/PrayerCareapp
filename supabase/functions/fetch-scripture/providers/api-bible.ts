import type { ScriptureFetchResult, ScriptureProvider, TranslationConfig } from '../catalog.ts';

const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ApiBibleProvider implements ScriptureProvider {
  id = 'api-bible';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchPassage(
    reference: string,
    translation: TranslationConfig,
  ): Promise<ScriptureFetchResult> {
    const bibleId = translation.providerTranslationId;
    const searchUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/search?query=${encodeURIComponent(reference)}&limit=5`;

    const response = await fetch(searchUrl, {
      headers: { 'api-key': this.apiKey },
    });

    if (!response.ok) {
      console.error('API.Bible search failed:', response.status, await response.text());
      throw new Error(
        'Could not fetch verse from API.Bible. Check your API key and translation license.',
      );
    }

    const searchJson = await response.json();
    const verses = searchJson?.data?.verses ?? searchJson?.data?.passages ?? [];

    let text = '';
    if (Array.isArray(verses) && verses.length > 0) {
      text = stripHtml(verses[0].text ?? verses[0].content ?? '');
    }

    if (!text && Array.isArray(searchJson?.data?.passages) && searchJson.data.passages[0]?.content) {
      text = stripHtml(searchJson.data.passages[0].content);
    }

    if (!text) {
      throw new Error(
        `No verse found for "${reference}". Try a format like John 3:16 or Philippians 4:6-7.`,
      );
    }

    return {
      reference,
      text,
      translation_id: translation.id,
      provider: this.id,
    };
  }
}
