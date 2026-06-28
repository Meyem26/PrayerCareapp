import { DEFAULT_BIBLE_TRANSLATION_ID } from '@/constants/bible-translations';
import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import { getTodayDateString } from '@/lib/utils/date';
import type {
  CreatePrayerInput,
  Prayer,
  PrayerCategory,
  PrayerTimelineEvent,
  PrayerWithRelations,
  UpdatePrayerInput,
} from '@/types/prayer';

function todayForTimezone(timezone: string): string {
  return getTodayDateString(timezone);
}

export async function fetchTodayPrayers(
  userId: string,
  timezone: string,
): Promise<{ data: Prayer[]; error: string | null }> {
  const date = todayForTimezone(timezone);
  const { data, error } = await supabase.rpc('get_prayers_for_date', {
    p_user_id: userId,
    p_date: date,
  });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Prayer[], error: null };
}

export async function fetchJourneyPrayers(): Promise<{
  data: PrayerWithRelations[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('prayers')
    .select(
      `
      *,
      prayer_schedules (*),
      prayer_categories (label)
    `,
    )
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PrayerWithRelations[], error: null };
}

export async function fetchPrayerCategories(): Promise<{
  data: PrayerCategory[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('prayer_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as PrayerCategory[], error: null };
}

export async function fetchPrayerDetail(prayerId: string): Promise<{
  data: PrayerWithRelations | null;
  timeline: PrayerTimelineEvent[];
  error: string | null;
}> {
  const [prayerResult, timelineResult] = await Promise.all([
    supabase
      .from('prayers')
      .select(
        `
        *,
        prayer_schedules (*),
        prayer_categories (label),
        scripture_snapshots (*)
      `,
      )
      .eq('id', prayerId)
      .maybeSingle(),
    supabase
      .from('prayer_timeline_events')
      .select('*')
      .eq('prayer_id', prayerId)
      .order('created_at', { ascending: false }),
  ]);

  if (prayerResult.error) {
    return { data: null, timeline: [], error: prayerResult.error.message };
  }

  if (!prayerResult.data) {
    return { data: null, timeline: [], error: 'Prayer not found.' };
  }

  return {
    data: prayerResult.data as PrayerWithRelations,
    timeline: (timelineResult.data ?? []) as PrayerTimelineEvent[],
    error: timelineResult.error?.message ?? null,
  };
}

export async function createPrayer(
  input: CreatePrayerInput,
): Promise<{ data: Prayer | null; error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();

  if (authError || !userId) {
    return { data: null, error: authError ?? 'You must be signed in to save a prayer.' };
  }

  const startDate = todayForTimezone(input.timezone);

  const { data: prayer, error: prayerError } = await supabase.rpc('create_personal_prayer', {
    p_title: input.title.trim(),
    p_body: input.body.trim(),
    p_schedule_type: input.scheduleType,
    p_timezone: input.timezone,
    p_start_date: startDate,
    p_prayer_point: input.prayerPoint?.trim() || null,
    p_category_id: input.categoryId ?? null,
    p_weekdays: input.weekdays ?? [],
    p_custom_end_date: input.customEndDate ?? null,
    p_scripture_reference: input.scriptureReference?.trim() || null,
    p_scripture_text: input.scriptureText?.trim() || null,
    p_translation_id: input.translationId ?? DEFAULT_BIBLE_TRANSLATION_ID,
    p_ai_generated: input.aiGenerated ?? false,
    p_ai_prompt_snapshot: input.aiPromptSnapshot ?? null,
    p_group_id: input.groupId ?? null,
    p_creator_keeps_personal: input.creatorKeepsPersonal ?? true,
  });

  if (prayerError) {
    const message = prayerError.message.includes('Not authenticated')
      ? 'Your session expired. Please sign out and sign in again, then retry.'
      : prayerError.message;

    return { data: null, error: message };
  }

  if (!prayer) {
    return {
      data: null,
      error:
        'Could not save prayer. Run migration 20250628000007_create_personal_prayer_rpc.sql in Supabase SQL Editor.',
    };
  }

  return { data: prayer as Prayer, error: null };
}

export async function sharePrayerToGroup(
  prayerId: string,
  groupId: string,
  creatorKeepsPersonal = true,
): Promise<{ error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { error: authError };

  const { error } = await supabase.rpc('share_prayer_to_group', {
    p_prayer_id: prayerId,
    p_group_id: groupId,
    p_creator_keeps_personal: creatorKeepsPersonal,
  });

  if (error?.message.includes('creator_keeps_personal')) {
    return {
      error:
        'Could not share prayer. Run migration 20250628000011_creator_keeps_personal.sql in Supabase.',
    };
  }

  return { error: error?.message ?? null };
}

export async function updatePrayer(
  prayerId: string,
  userId: string,
  input: UpdatePrayerInput,
  timezone: string,
): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.prayer_point !== undefined) updates.prayer_point = input.prayer_point?.trim() || null;
  if (input.body !== undefined) updates.body = input.body.trim();
  if (input.category_id !== undefined) updates.category_id = input.category_id;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('prayers').update(updates).eq('id', prayerId);
    if (error) return { error: error.message };
  }

  if (input.scheduleType !== undefined) {
    const { error } = await supabase
      .from('prayer_schedules')
      .update({
        schedule_type: input.scheduleType,
        weekdays: input.weekdays ?? [],
        custom_end_date: input.customEndDate ?? null,
        timezone,
      })
      .eq('prayer_id', prayerId);

    if (error) return { error: error.message };

    await supabase.from('prayer_timeline_events').insert({
      prayer_id: prayerId,
      actor_id: userId,
      event_type: 'schedule_changed',
      metadata: { schedule_type: input.scheduleType },
    });
  }

  if (input.scriptureReference !== undefined || input.scriptureText !== undefined) {
    const { data: existing } = await supabase
      .from('scripture_snapshots')
      .select('id')
      .eq('prayer_id', prayerId)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('scripture_snapshots')
        .update({
          reference: input.scriptureReference?.trim() ?? '',
          text: input.scriptureText?.trim() ?? '',
          translation_id: input.translationId ?? DEFAULT_BIBLE_TRANSLATION_ID,
        })
        .eq('id', existing.id);
    } else if (input.scriptureReference?.trim() && input.scriptureText?.trim()) {
      await supabase.from('scripture_snapshots').insert({
        prayer_id: prayerId,
        reference: input.scriptureReference.trim(),
        text: input.scriptureText.trim(),
        translation_id: input.translationId ?? DEFAULT_BIBLE_TRANSLATION_ID,
        source: 'manual',
      });
    }

    await supabase.from('prayer_timeline_events').insert({
      prayer_id: prayerId,
      actor_id: userId,
      event_type: 'scripture_updated',
      metadata: {},
    });
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('prayer_timeline_events').insert({
      prayer_id: prayerId,
      actor_id: userId,
      event_type: 'edited',
      metadata: {},
    });
  }

  return { error: null };
}

export async function deletePrayer(prayerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('prayers').delete().eq('id', prayerId);
  return { error: error?.message ?? null };
}

export async function setPrayerHidden(
  prayerId: string,
  userId: string,
  hidden: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('prayers')
    .update({ is_hidden: hidden })
    .eq('id', prayerId);

  if (error) return { error: error.message };

  await supabase.from('prayer_timeline_events').insert({
    prayer_id: prayerId,
    actor_id: userId,
    event_type: hidden ? 'hidden' : 'unhidden',
    metadata: {},
  });

  return { error: null };
}

export async function logPrayerActivity(
  prayerId: string,
  userId: string,
  timezone: string,
): Promise<{ error: string | null }> {
  const date = todayForTimezone(timezone);
  const { error } = await supabase.rpc('log_prayer_activity', {
    p_prayer_id: prayerId,
    p_user_id: userId,
    p_activity_date: date,
  });

  return { error: error?.message ?? null };
}

export async function markPrayerAnswered(
  prayerId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('handle_prayer_answered', {
    p_prayer_id: prayerId,
    p_user_id: userId,
  });

  return { error: error?.message ?? null };
}

export async function restartPrayer(
  prayerId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('restart_prayer', {
    p_prayer_id: prayerId,
    p_user_id: userId,
  });

  return { error: error?.message ?? null };
}
