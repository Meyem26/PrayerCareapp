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

let prayerSavedSinceLastVisit = false;

/** Called after a prayer is created so the Pray tab can start fresh instead of offering a repeat. */
export function markPrayerSaved(): void {
  prayerSavedSinceLastVisit = true;
}

export function consumePrayerSaved(): boolean {
  const value = prayerSavedSinceLastVisit;
  prayerSavedSinceLastVisit = false;
  return value;
}
