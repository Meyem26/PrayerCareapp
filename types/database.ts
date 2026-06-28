import type {
  Prayer,
  PrayerCategory,
  PrayerSchedule,
  PrayerTimelineEvent,
  ScriptureSnapshot,
} from '@/types/prayer';

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  bible_translation_id: string;
  praise_visibility_days: number;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableDef<T, I = Partial<T>, U = Partial<T>> = {
  Row: T;
  Insert: I;
  Update: U;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile, Partial<Profile> & { id: string }>;
      notification_preferences: TableDef<{
        user_id: string;
        daily_prayer_reminder: boolean;
        daily_reminder_time: string;
        care_action_due: boolean;
        group_invites: boolean;
        weekly_encouragement: boolean;
        updated_at: string;
      }>;
      prayers: TableDef<
        Prayer,
        {
          creator_id: string;
          visibility?: string;
          title: string;
          prayer_point?: string | null;
          body: string;
          category_id?: string | null;
          status?: string;
          group_id?: string | null;
          ai_generated?: boolean;
        }
      >;
      prayer_schedules: TableDef<
        PrayerSchedule,
        {
          prayer_id: string;
          schedule_type: string;
          weekdays?: number[];
          start_date: string;
          custom_end_date?: string | null;
          timezone: string;
        }
      >;
      prayer_categories: TableDef<PrayerCategory>;
      prayer_timeline_events: TableDef<
        PrayerTimelineEvent,
        {
          prayer_id: string;
          actor_id: string;
          event_type: string;
          metadata?: Record<string, unknown>;
        }
      >;
      scripture_snapshots: TableDef<
        ScriptureSnapshot,
        {
          prayer_id?: string;
          reference: string;
          text: string;
          translation_id?: string;
          source?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_prayers_for_date: {
        Args: { p_user_id: string; p_date: string };
        Returns: Prayer[];
      };
      log_prayer_activity: {
        Args: { p_prayer_id: string; p_user_id: string; p_activity_date: string };
        Returns: unknown;
      };
      handle_prayer_answered: {
        Args: { p_prayer_id: string; p_user_id: string; p_praise_days?: number };
        Returns: Prayer;
      };
      restart_prayer: {
        Args: { p_prayer_id: string; p_user_id: string };
        Returns: Prayer;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
