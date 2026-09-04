import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { fetchNotificationPreferences } from '@/lib/api/history';
import { fetchActivePrayersForReminderSync } from '@/lib/api/prayer-reminders';
import { normalizeReminderTime } from '@/constants/reminders';
import { registerForPushNotifications } from '@/lib/notifications/register';
import { ensurePrayerReminderChannel } from '@/lib/notifications/permissions';
import {
  syncDailyDigestNotification,
  syncPrayerLocalNotifications,
} from '@/lib/notifications/schedule-reminders';
import type { ScheduleType } from '@/types/prayer';

function openFromNotificationData(data: Record<string, unknown> | undefined) {
  if (!data) return;

  if (data.type === 'prayer_reminder' && typeof data.prayerId === 'string') {
    router.push({ pathname: '/prayer/[id]', params: { id: data.prayerId } });
    return;
  }

  if (data.type === 'daily_digest') {
    router.push('/(tabs)');
  }
}

async function resyncLocalReminders(userId: string) {
  if (Platform.OS === 'web') return;

  await ensurePrayerReminderChannel();

  const { data: prefs } = await fetchNotificationPreferences();
  if (prefs) {
    await syncDailyDigestNotification(prefs.daily_prayer_reminder, prefs.daily_reminder_time);
  }

  const { data: prayers } = await fetchActivePrayersForReminderSync(userId);
  for (const prayer of prayers) {
    const schedule = Array.isArray(prayer.prayer_schedules)
      ? prayer.prayer_schedules[0]
      : prayer.prayer_schedules;
    const reminders = prayer.prayer_reminders ?? [];
    if (!schedule || reminders.length === 0) continue;

    await syncPrayerLocalNotifications({
      prayerId: prayer.id,
      title: prayer.title,
      prayerPoint: prayer.prayer_point,
      scheduleType: schedule.schedule_type as ScheduleType,
      weekdays: schedule.weekdays ?? [],
      startDate: schedule.start_date,
      timezone: schedule.timezone,
      reminders: reminders.map((row) => ({
        id: row.id,
        time: normalizeReminderTime(row.reminder_time),
        enabled: row.enabled,
      })),
    });
  }
}

export function NotificationBootstrap() {
  const { user, needsOnboarding, isEmailVerified } = useAuth();
  const responseSub = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user?.id || needsOnboarding || !isEmailVerified) return;
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      await registerForPushNotifications(user.id);
      if (cancelled) return;
      await resyncLocalReminders(user.id);
    })();

    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      openFromNotificationData(data);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as Record<string, unknown>;
      openFromNotificationData(data);
    });

    return () => {
      cancelled = true;
      responseSub.current?.remove();
    };
  }, [user?.id, needsOnboarding, isEmailVerified]);

  return null;
}
