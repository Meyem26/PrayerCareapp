/** Verify AI-suggested Bible references. Never trust model verse text. */

const BIBLE_API_COM = 'https://bible-api.com';
const BIBLE_DATA_BASE =
  'https://raw.githubusercontent.com/midvash/bible-data/main/versions';

type ProviderKind = 'bible-api-com' | 'bible-data';

type TranslationRoute = {
  id: string;
  kind: ProviderKind;
  providerId: string;
  /** Language folder for bible-data (e.g. fr). */
  language?: string;
};

const AUTO_FETCH_TRANSLATIONS: Record<string, TranslationRoute> = {
  WEB: { id: 'WEB', kind: 'bible-api-com', providerId: 'web' },
  KJV: { id: 'KJV', kind: 'bible-api-com', providerId: 'kjv' },
  ASV: { id: 'ASV', kind: 'bible-api-com', providerId: 'asv' },
  RV1909: { id: 'RV1909', kind: 'bible-api-com', providerId: 'rv1909' },
  LSG1910: { id: 'LSG1910', kind: 'bible-data', providerId: 'lsg', language: 'fr' },
};

const DEFAULT_TRANSLATION = 'WEB';

/** Map common book names / aliases → OSIS codes used by midvash bible-data. */
const BOOK_TO_OSIS: Record<string, string> = {
  genesis: 'Gen',
  genèse: 'Gen',
  genese: 'Gen',
  exodus: 'Exod',
  exode: 'Exod',
  leviticus: 'Lev',
  lévitique: 'Lev',
  levitiique: 'Lev',
  numbers: 'Num',
  nombres: 'Num',
  deuteronomy: 'Deut',
  deutéronome: 'Deut',
  deuteronome: 'Deut',
  joshua: 'Josh',
  josué: 'Josh',
  josue: 'Josh',
  judges: 'Judg',
  juges: 'Judg',
  ruth: 'Ruth',
  '1 samuel': '1Sam',
  '2 samuel': '2Sam',
  '1 kings': '1Kgs',
  '1 rois': '1Kgs',
  '2 kings': '2Kgs',
  '2 rois': '2Kgs',
  '1 chronicles': '1Chr',
  '1 chroniques': '1Chr',
  '2 chronicles': '2Chr',
  '2 chroniques': '2Chr',
  ezra: 'Ezra',
  esdras: 'Ezra',
  nehemiah: 'Neh',
  néhémie: 'Neh',
  nehemie: 'Neh',
  esther: 'Esth',
  job: 'Job',
  psalm: 'Ps',
  psalms: 'Ps',
  psaume: 'Ps',
  psaumes: 'Ps',
  proverbs: 'Prov',
  proverbes: 'Prov',
  ecclesiastes: 'Eccl',
  ecclésiaste: 'Eccl',
  ecclesiaste: 'Eccl',
  'song of solomon': 'Song',
  'song of songs': 'Song',
  cantique: 'Song',
  'cantique des cantiques': 'Song',
  isaiah: 'Isa',
  ésaïe: 'Isa',
  esaie: 'Isa',
  jeremiah: 'Jer',
  jérémie: 'Jer',
  jeremie: 'Jer',
  lamentations: 'Lam',
  ezekiel: 'Ezek',
  ézéchiel: 'Ezek',
  ezechiel: 'Ezek',
  daniel: 'Dan',
  hosea: 'Hos',
  osée: 'Hos',
  osee: 'Hos',
  joel: 'Joel',
  joël: 'Joel',
  amos: 'Amos',
  obadiah: 'Obad',
  abdias: 'Obad',
  jonah: 'Jonah',
  jonas: 'Jonah',
  micah: 'Mic',
  michée: 'Mic',
  michee: 'Mic',
  nahum: 'Nah',
  habakkuk: 'Hab',
  habacuc: 'Hab',
  zephaniah: 'Zeph',
  sophonie: 'Zeph',
  haggai: 'Hag',
  aggée: 'Hag',
  aggee: 'Hag',
  zechariah: 'Zech',
  zacharie: 'Zech',
  malachi: 'Mal',
  malachie: 'Mal',
  matthew: 'Matt',
  matthieu: 'Matt',
  mark: 'Mark',
  marc: 'Mark',
  luke: 'Luke',
  luc: 'Luke',
  john: 'John',
  jean: 'John',
  acts: 'Acts',
  actes: 'Acts',
  romans: 'Rom',
  romains: 'Rom',
  '1 corinthians': '1Cor',
  '1 corinthiens': '1Cor',
  '2 corinthians': '2Cor',
  '2 corinthiens': '2Cor',
  galatians: 'Gal',
  galates: 'Gal',
  ephesians: 'Eph',
  éphésiens: 'Eph',
  ephesiens: 'Eph',
  philippians: 'Phil',
  philippiens: 'Phil',
  colossians: 'Col',
  colossiens: 'Col',
  '1 thessalonians': '1Thess',
  '1 thessaloniciens': '1Thess',
  '2 thessalonians': '2Thess',
  '2 thessaloniciens': '2Thess',
  '1 timothy': '1Tim',
  '1 timothée': '1Tim',
  '1 timothee': '1Tim',
  '2 timothy': '2Tim',
  '2 timothée': '2Tim',
  '2 timothee': '2Tim',
  titus: 'Titus',
  tite: 'Titus',
  philemon: 'Phlm',
  philémon: 'Phlm',
  hebrews: 'Heb',
  hébreux: 'Heb',
  hebreux: 'Heb',
  james: 'Jas',
  jacques: 'Jas',
  '1 peter': '1Pet',
  '1 pierre': '1Pet',
  '2 peter': '2Pet',
  '2 pierre': '2Pet',
  '1 john': '1John',
  '1 jean': '1John',
  '2 john': '2John',
  '2 jean': '2John',
  '3 john': '3John',
  '3 jean': '3John',
  jude: 'Jude',
  revelation: 'Rev',
  apocalypse: 'Rev',
};

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

function resolveRoute(preferredId: string): TranslationRoute {
  const key = (preferredId || DEFAULT_TRANSLATION).toUpperCase();
  return AUTO_FETCH_TRANSLATIONS[key] ?? AUTO_FETCH_TRANSLATIONS[DEFAULT_TRANSLATION];
}

function parseReference(reference: string): {
  bookKey: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
} | null {
  const cleaned = reference.trim().replace(/\s+/g, ' ');
  const match = cleaned.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/u);
  if (!match) return null;
  const bookKey = match[1].toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const chapter = Number(match[2]);
  const verseStart = Number(match[3]);
  const verseEnd = match[4] ? Number(match[4]) : verseStart;
  if (!chapter || !verseStart) return null;
  return { bookKey, chapter, verseStart, verseEnd };
}

async function fetchFromBibleApiCom(
  reference: string,
  route: TranslationRoute,
): Promise<ScriptureVerifyResult> {
  const path = encodeURIComponent(reference);
  const url = `${BIBLE_API_COM}/${path}?translation=${route.providerId}`;
  const response = await fetch(url);
  if (!response.ok) {
    return {
      verified: false,
      reference,
      reason: `Could not verify "${reference}". Try a standard reference like Philippians 4:6-7.`,
    };
  }
  const json = await response.json();
  const text = typeof json.text === 'string' ? json.text.trim() : '';
  if (!text) {
    return { verified: false, reference, reason: `No verse text found for "${reference}".` };
  }
  return {
    verified: true,
    reference:
      typeof json.reference === 'string' && json.reference.trim()
        ? json.reference.trim()
        : reference,
    text,
    translation_id: route.id,
  };
}

async function fetchFromBibleData(
  reference: string,
  route: TranslationRoute,
): Promise<ScriptureVerifyResult> {
  const parsed = parseReference(reference);
  if (!parsed) {
    return {
      verified: false,
      reference,
      reason: `Could not parse "${reference}". Use a form like Jean 3:16 or John 3:16.`,
    };
  }

  const normalizedBook = parsed.bookKey.normalize('NFD').replace(/\p{M}/gu, '');
  const osis =
    BOOK_TO_OSIS[parsed.bookKey] ??
    BOOK_TO_OSIS[normalizedBook] ??
    Object.entries(BOOK_TO_OSIS).find(([key]) => {
      const keyNorm = key.normalize('NFD').replace(/\p{M}/gu, '');
      return keyNorm === normalizedBook;
    })?.[1];

  if (!osis) {
    return {
      verified: false,
      reference,
      reason: `Unknown book in "${reference}".`,
    };
  }

  const url = `${BIBLE_DATA_BASE}/${route.language}/${route.providerId}/books/${osis}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    return {
      verified: false,
      reference,
      reason: `Could not load ${route.id} text for "${reference}".`,
    };
  }

  const book = await response.json();
  const chapter = (book.chapters as { chapter: number; verses: { number: number; text: string }[] }[])
    ?.find((c) => c.chapter === parsed.chapter);
  if (!chapter) {
    return { verified: false, reference, reason: `Chapter not found for "${reference}".` };
  }

  const verses = chapter.verses.filter(
    (v) => v.number >= parsed.verseStart && v.number <= parsed.verseEnd,
  );
  if (verses.length === 0) {
    return { verified: false, reference, reason: `Verse not found for "${reference}".` };
  }

  const text = verses.map((v) => v.text.trim()).join(' ').trim();
  const displayRef =
    parsed.verseStart === parsed.verseEnd
      ? `${osis} ${parsed.chapter}:${parsed.verseStart}`
      : `${osis} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`;

  return {
    verified: true,
    reference: displayRef,
    text,
    translation_id: route.id,
  };
}

/**
 * Fetch canonical verse text for a reference. Returns verified text only from a trusted source.
 */
export async function verifyScriptureReference(
  reference: string,
  preferredTranslationId: string,
): Promise<ScriptureVerifyResult> {
  const cleaned = reference.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { verified: false, reference: '', reason: 'No Scripture reference was provided.' };
  }

  const route = resolveRoute(preferredTranslationId);

  try {
    if (route.kind === 'bible-data') {
      return await fetchFromBibleData(cleaned, route);
    }
    return await fetchFromBibleApiCom(cleaned, route);
  } catch (err) {
    console.error('verifyScriptureReference failed:', err);
    return {
      verified: false,
      reference: cleaned,
      reason: 'Scripture verification is temporarily unavailable.',
    };
  }
}
