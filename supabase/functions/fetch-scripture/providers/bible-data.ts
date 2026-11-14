import type { ScriptureFetchResult, ScriptureProvider, TranslationConfig } from '../catalog.ts';

const BIBLE_DATA_BASE =
  'https://raw.githubusercontent.com/midvash/bible-data/main/versions';

/** Common English / French book names → OSIS codes used by midvash. */
const BOOK_TO_OSIS: Record<string, string> = {
  genesis: 'Gen',
  genèse: 'Gen',
  genese: 'Gen',
  exodus: 'Exod',
  exode: 'Exod',
  leviticus: 'Lev',
  lévitique: 'Lev',
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
  'song of solomon': 'Song',
  'song of songs': 'Song',
  cantique: 'Song',
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
  joel: 'Joel',
  joël: 'Joel',
  amos: 'Amos',
  obadiah: 'Obad',
  abdias: 'Obad',
  jonah: 'Jonah',
  jonas: 'Jonah',
  micah: 'Mic',
  michée: 'Mic',
  nahum: 'Nah',
  habakkuk: 'Hab',
  habacuc: 'Hab',
  zephaniah: 'Zeph',
  sophonie: 'Zeph',
  haggai: 'Hag',
  aggée: 'Hag',
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

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function resolveOsis(bookName: string): string | null {
  const key = bookName.toLowerCase().trim();
  const keyNorm = stripDiacritics(key);
  return (
    BOOK_TO_OSIS[key] ??
    BOOK_TO_OSIS[keyNorm] ??
    Object.entries(BOOK_TO_OSIS).find(([name]) => stripDiacritics(name) === keyNorm)?.[1] ??
    null
  );
}

export class BibleDataProvider implements ScriptureProvider {
  id = 'bible-data';

  async fetchPassage(
    reference: string,
    translation: TranslationConfig,
  ): Promise<ScriptureFetchResult> {
    const cleaned = reference.trim().replace(/\s+/g, ' ');
    const match = cleaned.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/u);
    if (!match) {
      throw new Error(`Could not parse Scripture reference: ${reference}`);
    }

    const osis = resolveOsis(match[1]);
    if (!osis) {
      throw new Error(`Unknown Bible book in reference: ${reference}`);
    }

    const chapterNum = Number(match[2]);
    const verseStart = Number(match[3]);
    const verseEnd = match[4] ? Number(match[4]) : verseStart;
    const language = translation.language ?? 'fr';
    const slug = translation.providerTranslationId;
    const url = `${BIBLE_DATA_BASE}/${language}/${slug}/books/${osis}.json`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`bible-data fetch failed (${response.status}) for ${reference}`);
    }

    const book = await response.json();
    const chapter = (book.chapters as { chapter: number; verses: { number: number; text: string }[] }[])
      ?.find((c) => c.chapter === chapterNum);
    if (!chapter) {
      throw new Error(`Chapter not found for ${reference}`);
    }

    const verses = chapter.verses.filter((v) => v.number >= verseStart && v.number <= verseEnd);
    if (verses.length === 0) {
      throw new Error(`Verse not found for ${reference}`);
    }

    const text = verses.map((v) => v.text.trim()).join(' ').trim();
    const displayRef =
      verseStart === verseEnd
        ? `${osis} ${chapterNum}:${verseStart}`
        : `${osis} ${chapterNum}:${verseStart}-${verseEnd}`;

    return {
      reference: displayRef,
      text,
      translation_id: translation.id,
      provider: this.id,
    };
  }
}
