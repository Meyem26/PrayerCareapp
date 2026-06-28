import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import { fetchScriptureFromApi } from '@/lib/api/bible';
import type {
  CreateSermonNoteInput,
  SermonNote,
  SermonNoteWithReferences,
  UpdateSermonNoteInput,
} from '@/types/sermon';

const SERMON_SELECT = `
  *,
  sermon_references (
    id,
    reference,
    sort_order,
    created_at,
    scripture_snapshots ( id, reference, text, translation_id, source )
  )
`;

export async function fetchSermonNotes(): Promise<{
  data: SermonNote[];
  error: string | null;
}> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: [], error: authError };

  const { data, error } = await supabase
    .from('sermon_notes')
    .select('*')
    .order('sermon_date', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SermonNote[], error: null };
}

export async function fetchSermonNote(id: string): Promise<{
  data: SermonNoteWithReferences | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('sermon_notes')
    .select(SERMON_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'Sermon note not found.' };

  const note = data as SermonNoteWithReferences;
  note.sermon_references = (note.sermon_references ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return { data: note, error: null };
}

async function attachScriptureToReferences(
  sermonNoteId: string,
  references: string[],
  translationId: string,
): Promise<string | null> {
  for (let index = 0; index < references.length; index++) {
    const reference = references[index].trim();
    if (!reference) continue;

    const { data: refRow, error: refError } = await supabase
      .from('sermon_references')
      .insert({
        sermon_note_id: sermonNoteId,
        reference,
        sort_order: index,
      })
      .select('id')
      .single();

    if (refError || !refRow) return refError?.message ?? 'Could not save reference.';

    const { data: scripture, error: scriptureError } = await fetchScriptureFromApi(
      reference,
      translationId,
    );

    if (scriptureError || !scripture) {
      const { error: snapshotError } = await supabase.from('scripture_snapshots').insert({
        sermon_reference_id: refRow.id,
        reference,
        text: scriptureError ?? 'Verse text could not be loaded. Tap Fetch verse on the note.',
        translation_id: translationId,
        source: 'manual',
      });
      if (snapshotError) return snapshotError.message;
      continue;
    }

    const { error: snapshotError } = await supabase.from('scripture_snapshots').insert({
      sermon_reference_id: refRow.id,
      reference: scripture.reference,
      text: scripture.text,
      translation_id: scripture.translation_id,
      source: 'api',
    });
    if (snapshotError) return snapshotError.message;
  }

  return null;
}

export async function createSermonNote(
  input: CreateSermonNoteInput,
): Promise<{ data: SermonNote | null; error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { data: null, error: authError };

  if (!input.title.trim()) {
    return { data: null, error: 'Please add a sermon title.' };
  }

  const { data: note, error: noteError } = await supabase
    .from('sermon_notes')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      speaker: input.speaker?.trim() || null,
      church: input.church?.trim() || null,
      sermon_date: input.sermonDate,
      meditation_notes: input.meditationNotes?.trim() || null,
    })
    .select('*')
    .single();

  if (noteError || !note) {
    return { data: null, error: noteError?.message ?? 'Could not create sermon note.' };
  }

  const refs = input.references.map((r) => r.trim()).filter(Boolean);
  if (refs.length > 0) {
    const refError = await attachScriptureToReferences(note.id, refs, input.translationId);
    if (refError) return { data: note as SermonNote, error: refError };
  }

  return { data: note as SermonNote, error: null };
}

export async function updateSermonNote(
  id: string,
  input: UpdateSermonNoteInput,
): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.speaker !== undefined) updates.speaker = input.speaker?.trim() || null;
  if (input.church !== undefined) updates.church = input.church?.trim() || null;
  if (input.sermonDate !== undefined) updates.sermon_date = input.sermonDate;
  if (input.meditation_notes !== undefined) {
    updates.meditation_notes = input.meditation_notes?.trim() || null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('sermon_notes').update(updates).eq('id', id);
    if (error) return { error: error.message };
  }

  if (input.references && input.translationId) {
    const { data: existingRefs } = await supabase
      .from('sermon_references')
      .select('id')
      .eq('sermon_note_id', id);

    if (existingRefs?.length) {
      await supabase.from('sermon_references').delete().eq('sermon_note_id', id);
    }

    const refError = await attachScriptureToReferences(
      id,
      input.references.map((r) => r.trim()).filter(Boolean),
      input.translationId,
    );
    if (refError) return { error: refError };
  }

  return { error: null };
}

export async function deleteSermonNote(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('sermon_notes').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function refreshSermonReferenceScripture(
  sermonReferenceId: string,
  reference: string,
  translationId: string,
): Promise<{ error: string | null }> {
  const { data: scripture, error: fetchError } = await fetchScriptureFromApi(
    reference,
    translationId,
  );

  if (fetchError || !scripture) return { error: fetchError ?? 'Could not fetch verse.' };

  const { data: existing } = await supabase
    .from('scripture_snapshots')
    .select('id')
    .eq('sermon_reference_id', sermonReferenceId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('scripture_snapshots')
      .update({
        reference: scripture.reference,
        text: scripture.text,
        translation_id: scripture.translation_id,
        source: 'api',
      })
      .eq('id', existing.id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from('scripture_snapshots').insert({
    sermon_reference_id: sermonReferenceId,
    reference: scripture.reference,
    text: scripture.text,
    translation_id: scripture.translation_id,
    source: 'api',
  });

  return { error: error?.message ?? null };
}
