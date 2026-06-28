import { supabase } from '@/lib/supabase';
import { ensureAuthenticated } from '@/lib/auth-session';
import type { DayHistory, NotificationPreferences, PrayerAnalytics } from '@/types/history';

export async function fetchHistoryForDate(
  userId: string,
  date: string,
): Promise<{ data: DayHistory | null; error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: null, error: authError };

  const { data, error } = await supabase.rpc('get_history_for_date', {
    p_user_id: userId,
    p_date: date,
  });

  if (error?.message.includes('get_history_for_date')) {
    return {
      data: null,
      error:
        'Could not load history. Run migration 20250628000012_history_analytics.sql in Supabase.',
    };
  }

  if (error) return { data: null, error: error.message };
  return { data: data as DayHistory, error: null };
}

export async function fetchHistoryActivityDates(
  userId: string,
  year: number,
  month: number,
): Promise<{ data: string[]; error: string | null }> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: [], error: authError };

  const { data, error } = await supabase.rpc('get_history_activity_dates', {
    p_user_id: userId,
    p_year: year,
    p_month: month,
  });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as string[], error: null };
}

export async function fetchPrayerAnalytics(userId: string): Promise<{
  data: PrayerAnalytics | null;
  error: string | null;
}> {
  const { error: authError } = await ensureAuthenticated();
  if (authError) return { data: null, error: authError };

  const { data, error } = await supabase.rpc('get_user_prayer_analytics', {
    p_user_id: userId,
  });

  if (error?.message.includes('get_user_prayer_analytics')) {
    return {
      data: null,
      error:
        'Could not load analytics. Run migration 20250628000012_history_analytics.sql in Supabase.',
    };
  }

  if (error) return { data: null, error: error.message };
  return { data: data as PrayerAnalytics, error: null };
}

export async function fetchNotificationPreferences(): Promise<{
  data: NotificationPreferences | null;
  error: string | null;
}> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { data: null, error: authError };

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as NotificationPreferences | null, error: null };
}

export async function updateNotificationPreferences(
  updates: Partial<
    Pick<
      NotificationPreferences,
      | 'daily_prayer_reminder'
      | 'daily_reminder_time'
      | 'care_action_due'
      | 'group_invites'
      | 'weekly_encouragement'
    >
  >,
): Promise<{ error: string | null }> {
  const { userId, error: authError } = await ensureAuthenticated();
  if (authError || !userId) return { error: authError };

  const { error } = await supabase
    .from('notification_preferences')
    .update(updates)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}
