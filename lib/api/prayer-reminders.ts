import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import { normalizeReminderTime } from '@/constants/reminders';
import type { PrayerReminder, ReminderTimeDraft } from '@/types/reminder';

export async function fetchPrayerReminders(
  prayerId: string,
): Promise<{ data: PrayerReminder[]; error: string | null }> {
  const { data, error } = await supabase
    .from('prayer_reminders')
    .select('*')
    .eq('prayer_id', prayerId)
    .order('sort_order', { ascending: true })
    .order('reminder_time', { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes('prayer_reminders')) {
      return {
        data: [],
        error:
          'Prayer reminders need migration 024. Run supabase/migrations/20250628000024_prayer_reminders.sql in the Supabase SQL Editor.',
      };
    }
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as PrayerReminder[], error: null };
}

/**
 * Replace all reminder times for a prayer.
 * Pass drafts from the create/edit form; empty array clears reminders.
 */
export async function replacePrayerReminders(
  prayerId: string,
  drafts: ReminderTimeDraft[],
): Promise<{ data: PrayerReminder[]; error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: [], error: authError };

  const { error: deleteError } = await supabase
    .from('prayer_reminders')
    .delete()
    .eq('prayer_id', prayerId);

  if (deleteError) {
    if (deleteError.message.toLowerCase().includes('prayer_reminders')) {
      return {
        data: [],
        error:
          'Prayer reminders need migration 024. Run supabase/migrations/20250628000024_prayer_reminders.sql in the Supabase SQL Editor.',
      };
    }
    return { data: [], error: deleteError.message };
  }

  const unique = new Map<string, ReminderTimeDraft>();
  for (const draft of drafts) {
    const time = normalizeReminderTime(draft.time);
    unique.set(time, { ...draft, time });
  }

  const rows = Array.from(unique.values()).map((draft, index) => ({
    prayer_id: prayerId,
    reminder_time: `${draft.time}:00`,
    enabled: draft.enabled,
    sort_order: index,
  }));

  if (rows.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase.from('prayer_reminders').insert(rows).select('*');

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PrayerReminder[], error: null };
}

export async function fetchActivePrayersForReminderSync(userId: string): Promise<{
  data: Array<{
    id: string;
    title: string;
    prayer_point: string | null;
    prayer_schedules: Array<{
      schedule_type: string;
      weekdays: number[];
      start_date: string;
      timezone: string;
    }> | null;
    prayer_reminders: PrayerReminder[] | null;
  }>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('prayers')
    .select(
      `
      id,
      title,
      prayer_point,
      prayer_schedules ( schedule_type, weekdays, start_date, timezone ),
      prayer_reminders ( * )
    `,
    )
    .eq('creator_id', userId)
    .eq('status', 'active')
    .eq('is_hidden', false);

  if (error) {
    if (error.message.toLowerCase().includes('prayer_reminders')) {
      return { data: [], error: null };
    }
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as never, error: null };
}
