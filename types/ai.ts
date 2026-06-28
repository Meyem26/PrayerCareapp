export type GeneratedPrayer = {
  title: string;
  prayer_point: string;
  prayer_text: string;
  scripture_reference: string;
  scripture_text: string;
};

export type GeneratedVerse = {
  reference: string;
  text: string;
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
