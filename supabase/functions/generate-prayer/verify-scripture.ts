/** Verify AI-suggested Bible references via public-domain bible-api.com. Never trust model verse text. */

const BASE_URL = 'https://bible-api.com';

const AUTO_FETCH_TRANSLATIONS: Record<string, string> = {
  WEB: 'web',
  KJV: 'kjv',
  ASV: 'asv',
};

const DEFAULT_TRANSLATION = 'WEB';

export type VerifiedScripture = {
  reference: string;
  text: string;
  translation_id: string;
  verified: true;
};

export type ScriptureVerifyFailure = {
  verified: false;
  reference: string;
  reason: string;
};

export type ScriptureVerifyResult = VerifiedScripture | ScriptureVerifyFailure;

function resolveProviderTranslationId(preferredId: string): { id: string; providerId: string } {
  const key = (preferredId || DEFAULT_TRANSLATION).toUpperCase();
  if (AUTO_FETCH_TRANSLATIONS[key]) {
    return { id: key, providerId: AUTO_FETCH_TRANSLATIONS[key] };
  }
  return { id: DEFAULT_TRANSLATION, providerId: AUTO_FETCH_TRANSLATIONS[DEFAULT_TRANSLATION] };
}

/**
 * Fetch canonical verse text for a reference. Returns verified text only from the Bible API.
 */
export async function verifyScriptureReference(
  reference: string,
  preferredTranslationId: string,
): Promise<ScriptureVerifyResult> {
  const cleaned = reference.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { verified: false, reference: '', reason: 'No Scripture reference was provided.' };
  }

  const translation = resolveProviderTranslationId(preferredTranslationId);
  const path = encodeURIComponent(cleaned);
  const url = `${BASE_URL}/${path}?translation=${translation.providerId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        verified: false,
        reference: cleaned,
        reason: `Could not verify "${cleaned}". Try a standard reference like Philippians 4:6-7.`,
      };
    }

    const json = await response.json();
    const text = typeof json.text === 'string' ? json.text.trim() : '';
    if (!text) {
      return {
        verified: false,
        reference: cleaned,
        reason: `No verse text found for "${cleaned}".`,
      };
    }

    return {
      verified: true,
      reference: typeof json.reference === 'string' && json.reference.trim()
        ? json.reference.trim()
        : cleaned,
      text,
      translation_id: translation.id,
    };
  } catch (err) {
    console.error('verifyScriptureReference failed:', err);
    return {
      verified: false,
      reference: cleaned,
      reason: 'Scripture verification is temporarily unavailable.',
    };
  }
}
