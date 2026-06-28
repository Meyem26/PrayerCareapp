import type { GeneratedPrayer } from '@/types/ai';

let draft: GeneratedPrayer | null = null;

export function setAiPrayerDraft(value: GeneratedPrayer): void {
  draft = value;
}

export function peekAiPrayerDraft(): GeneratedPrayer | null {
  return draft;
}

export function consumeAiPrayerDraft(): GeneratedPrayer | null {
  const value = draft;
  draft = null;
  return value;
}

export function clearAiPrayerDraft(): void {
  draft = null;
}
