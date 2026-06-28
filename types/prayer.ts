export type PrayerStatus = 'active' | 'answered' | 'hidden' | 'archived';
export type PrayerVisibility = 'personal' | 'group';
export type ScheduleType =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'specific_weekdays'
  | 'until_answered';

export type TimelineEventType =
  | 'created'
  | 'edited'
  | 'prayed'
  | 'hidden'
  | 'unhidden'
  | 'answered'
  | 'restarted'
  | 'note_added'
  | 'scripture_updated'
  | 'schedule_changed'
  | 'shared_to_group'
  | 'care_action_created'
  | 'care_action_completed'
  | 'praise_added';

export type Prayer = {
  id: string;
  creator_id: string;
  group_id: string | null;
  category_id: string | null;
  visibility: PrayerVisibility;
  title: string;
  prayer_point: string | null;
  body: string;
  status: PrayerStatus;
  is_hidden: boolean;
  answered_at: string | null;
  praise_visible_until: string | null;
  creator_keeps_personal: boolean;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type PrayerSchedule = {
  id: string;
  prayer_id: string;
  schedule_type: ScheduleType;
  weekdays: number[];
  start_date: string;
  custom_end_date: string | null;
  timezone: string;
};

export type PrayerCategory = {
  id: string;
  user_id: string | null;
  slug: string;
  label: string;
  sort_order: number;
};

export type ScriptureSnapshot = {
  id: string;
  prayer_id: string | null;
  reference: string;
  text: string;
  translation_id: string;
  source: 'ai' | 'api' | 'manual';
};

export type PrayerTimelineEvent = {
  id: string;
  prayer_id: string;
  actor_id: string;
  event_type: TimelineEventType;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PrayerWithRelations = Prayer & {
  prayer_schedules: PrayerSchedule | PrayerSchedule[] | null;
  prayer_categories: { label: string } | null;
  scripture_snapshots: ScriptureSnapshot[] | null;
};

export type CreatePrayerInput = {
  creatorId: string;
  timezone: string;
  title: string;
  prayerPoint?: string;
  body: string;
  categoryId?: string | null;
  scheduleType: ScheduleType;
  weekdays?: number[];
  customEndDate?: string | null;
  scriptureReference?: string;
  scriptureText?: string;
  translationId?: string;
  aiGenerated?: boolean;
  aiPromptSnapshot?: string | null;
  groupId?: string | null;
  creatorKeepsPersonal?: boolean;
};

export type UpdatePrayerInput = Partial<
  Pick<Prayer, 'title' | 'prayer_point' | 'body' | 'category_id'>
> & {
  scheduleType?: ScheduleType;
  weekdays?: number[];
  customEndDate?: string | null;
  scriptureReference?: string;
  scriptureText?: string;
  translationId?: string;
};
