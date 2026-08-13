export type GeneratedPrayer = {
  title: string;
  prayer_point: string;
  prayer_text: string;
  scripture_reference: string;
  scripture_text: string;
  /** True only when verse text came from the Bible API, not the model. */
  scripture_verified?: boolean;
  scripture_translation_id?: string | null;
  /** Present when a suggested reference could not be verified. */
  scripture_note?: string | null;
};

export type GeneratedVerse = {
  reference: string;
  text: string;
  translation_id?: string | null;
  verified?: boolean;
};

export type AiGenerateType = 'prayer' | 'verse';

export type GeneratePrayerRequest = {
  type: 'prayer';
  heart: string;
  translationId?: string;
};

export type GenerateVerseRequest = {
  type: 'verse';
  title: string;
  prayerPoint: string;
  translationId?: string;
};

export type AiGenerateRequest = GeneratePrayerRequest | GenerateVerseRequest;
