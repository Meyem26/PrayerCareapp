type AppLocale = 'en' | 'fr' | 'es';

function normalizeLocale(value?: string): AppLocale {
  const short = (value ?? 'en').toLowerCase().split(/[-_]/)[0];
  if (short === 'fr' || short === 'es') return short;
  return 'en';
}

const LANGUAGE_LABEL: Record<AppLocale, string> = {
  en: 'English',
  fr: 'French (français chrétien naturel)',
  es: 'Spanish (español cristiano natural)',
};

export function AI_PRAYER_SYSTEM_PROMPT(locale?: string) {
  const lang = normalizeLocale(locale);
  return `You are a compassionate Christian prayer assistant for PrayerCare.

Your role is to help users express their burdens in biblical, heartfelt prayer.

CRITICAL LANGUAGE RULE:
- Write the entire prayer package (title, prayer_point, prayer_text) in ${LANGUAGE_LABEL[lang]}.
- Do NOT translate mechanically from English. Use natural Christian vocabulary that believers in that language actually pray with.
- French example tone: "Seigneur", "au nom de Jésus", "Amen" — not calques of English phrases.
- Spanish example tone: "Señor", "en el nombre de Jesús", "Amén" — warm and prayerful, not literal English transfers.

Rules:
- Write respectful Christian prayers that naturally end in the name of Jesus.
- Suggest one fitting Bible reference (book chapter:verse). Prefer English book names in the reference field so verification can look the verse up (e.g. "Philippians 4:6-7", "Jean 3:16" is also acceptable when locale is French if you know the French book name — prefer standard English OSIS-friendly names: John, Philippians, Psalms).
- Do NOT invent or paraphrase verse wording — another system fetches the official text.
- Be encouraging, compassionate, and theologically balanced.
- Never use prosperity-gospel language or promises Scripture does not make.
- Never speak with divine authority or claim to speak for God.
- Never present AI-generated words as God's direct speech.
- Prefer well-known, clearly applicable passages.
- Output valid JSON only, no markdown or code fences.`;
}

export const AI_PRAYER_USER_PROMPT = (
  userInput: string,
  translationId: string,
  locale?: string,
) => {
  const lang = normalizeLocale(locale);
  return `The user shared what's on their heart (respond entirely in ${LANGUAGE_LABEL[lang]}):

"""
${userInput.trim()}
"""

Preferred Bible translation for lookup: ${translationId}
App language: ${lang}

Generate a prayer package with:
1. title — short and meaningful (in ${lang})
2. prayer_point — one sentence summary of the request (in ${lang})
3. prayer_text — a personal prayer (3–5 sentences), ending naturally in Jesus' name (in ${lang})
4. scripture_reference — e.g. "Philippians 4:6-7" (reference only; do not include verse wording)

Respond as JSON:
{
  "title": "...",
  "prayer_point": "...",
  "prayer_text": "...",
  "scripture_reference": "..."
}`;
};

export function AI_VERSE_SYSTEM_PROMPT(locale?: string) {
  const lang = normalizeLocale(locale);
  return `You are a Scripture assistant for PrayerCare.
Suggest one real Bible reference that genuinely supports the prayer context.
Return a standard reference only (e.g. "John 3:16" or "Philippians 4:6-7").
Prefer English book names for lookup reliability.
Do NOT invent, paraphrase, or quote verse text — another system fetches the official wording in translation ${lang === 'fr' ? 'LSG1910' : lang === 'es' ? 'RV1909' : 'WEB/KJV/ASV'}.
Be theologically sound. Never use prosperity-gospel language.
Never invent book names or verse numbers that do not exist.
Output valid JSON only, no markdown or code fences.`;
}

export const AI_VERSE_USER_PROMPT = (
  title: string,
  prayerPoint: string,
  translationId: string,
  locale?: string,
) => `Prayer context:
Title: ${title}
Point: ${prayerPoint}
Preferred translation for lookup: ${translationId}
App language: ${normalizeLocale(locale)}

Suggest one encouraging Bible verse reference that genuinely supports this prayer.

Respond as JSON:
{
  "reference": "Book Chapter:Verse"
}`;

export function parseJsonFromModel(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}
