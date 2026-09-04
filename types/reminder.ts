import type { ScheduleType } from '@/types/prayer';

export type PrayerReminder = {
  id: string;
  prayer_id: string;
  /** HH:MM:SS or HH:MM from Postgres TIME */
  reminder_time: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
};

/** Draft reminder before it is saved (create form / editing). */
export type ReminderTimeDraft = {
  /** Stable client key for list rendering */
  key: string;
  /** HH:MM 24h */
  time: string;
  enabled: boolean;
};

export type PrayerReminderSyncInput = {
  prayerId: string;
  title: string;
  prayerPoint?: string | null;
  scheduleType: ScheduleType;
  weekdays: number[];
  /** YYYY-MM-DD */
  startDate: string;
  timezone: string;
  reminders: Array<{ id: string; time: string; enabled: boolean }>;
};
