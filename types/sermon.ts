export type SermonReference = {
  id: string;
  sermon_note_id: string;
  reference: string;
  sort_order: number;
  created_at: string;
  scripture_snapshots?: ScriptureForReference[] | null;
};

export type ScriptureForReference = {
  id: string;
  reference: string;
  text: string;
  translation_id: string;
  source: 'ai' | 'api' | 'manual';
};

export type SermonNote = {
  id: string;
  user_id: string;
  title: string;
  speaker: string | null;
  church: string | null;
  sermon_date: string;
  meditation_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SermonNoteWithReferences = SermonNote & {
  sermon_references: SermonReference[];
};

export type CreateSermonNoteInput = {
  title: string;
  speaker?: string;
  church?: string;
  sermonDate: string;
  references: string[];
  meditationNotes?: string;
  translationId: string;
};

export type UpdateSermonNoteInput = Partial<
  Pick<SermonNote, 'title' | 'speaker' | 'church' | 'meditation_notes'>
> & {
  sermonDate?: string;
  references?: string[];
  translationId?: string;
};

export type FetchedScripture = {
  reference: string;
  text: string;
  translation_id: string;
  provider?: string;
  cached?: boolean;
  fallback_from?: string | null;
};
