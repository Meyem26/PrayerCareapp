export type HistoryPrayerItem = {
  id: string;
  title: string;
  prayer_point?: string | null;
};

export type HistoryAnsweredItem = {
  id: string;
  title: string;
  answered_at: string;
};

export type HistoryPrayedItem = {
  prayer_id: string;
  title: string;
  prayed_at: string;
};

export type HistoryPraiseItem = {
  prayer_id: string;
  title: string;
  body: string;
};

export type HistoryCareItem = {
  id: string;
  prayer_id: string;
  prayer_title: string;
  action_type: string;
  custom_label: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
};

export type DayHistory = {
  scheduled: HistoryPrayerItem[];
  answered: HistoryAnsweredItem[];
  prayed: HistoryPrayedItem[];
  praise: HistoryPraiseItem[];
  care_actions: HistoryCareItem[];
};

export type PrayerAnalytics = {
  active_prayers: number;
  answered_prayers: number;
  care_actions_pending: number;
  care_actions_completed: number;
  prayer_streak: number;
};

export type NotificationPreferences = {
  user_id: string;
  daily_prayer_reminder: boolean;
  daily_reminder_time: string;
  care_action_due: boolean;
  group_invites: boolean;
  weekly_encouragement: boolean;
  updated_at: string;
};
