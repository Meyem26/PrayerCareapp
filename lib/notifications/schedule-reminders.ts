import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  formatReminderTimeLabel,
  normalizeReminderTime,
  parseReminderTime,
  reminderNotificationBody,
  toExpoWeekday,
} from '@/constants/reminders';
import {
  ensureNotificationPermissions,
  ensurePrayerReminderChannel,
  PRAYER_REMINDER_CHANNEL_ID,
} from '@/lib/notifications/permissions';
import type { PrayerReminderSyncInput } from '@/types/reminder';
import type { ScheduleType } from '@/types/prayer';

const ID_PREFIX = 'pc-reminder:';

function notificationId(prayerId: string, reminderId: string, suffix: string): string {
  // Expo identifiers should stay reasonably short and stable
  return `${ID_PREFIX}${prayerId.slice(0, 8)}:${reminderId.slice(0, 8)}:${suffix}`;
}

export async function cancelPrayerLocalNotifications(prayerId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const short = prayerId.slice(0, 8);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.includes(`${ID_PREFIX}${short}:`))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

function nextDateForOnce(
  startDate: string,
  hour: number,
  minute: number,
): Date | null {
  const [y, m, d] = startDate.split('-').map(Number);
  if (!y || !m || !d) return null;

  const candidate = new Date(y, m - 1, d, hour, minute, 0, 0);
  const now = new Date();
  if (candidate.getTime() > now.getTime() + 15_000) {
    return candidate;
  }

  // If start day/time already passed, fire at the next matching clock time today/tomorrow
  const soon = new Date();
  soon.setHours(hour, minute, 0, 0);
  if (soon.getTime() <= now.getTime() + 15_000) {
    soon.setDate(soon.getDate() + 1);
  }
  return soon;
}

function weekdaysForSchedule(
  scheduleType: ScheduleType,
  weekdays: number[],
  startDate: string,
): number[] | 'daily' | 'once' {
  if (scheduleType === 'once') return 'once';
  if (scheduleType === 'daily' || scheduleType === 'until_answered') return 'daily';

  if (scheduleType === 'specific_weekdays') {
    return weekdays.length ? weekdays : 'daily';
  }

  // weekly → same weekday as start_date
  const [y, m, d] = startDate.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return [dow];
}

export async function syncPrayerLocalNotifications(
  input: PrayerReminderSyncInput,
): Promise<{ scheduled: number; error: string | null }> {
  if (Platform.OS === 'web') {
    return { scheduled: 0, error: null };
  }

  await cancelPrayerLocalNotifications(input.prayerId);

  const enabledReminders = input.reminders.filter((r) => r.enabled && r.time);
  if (enabledReminders.length === 0) {
    return { scheduled: 0, error: null };
  }

  const permitted = await ensureNotificationPermissions();
  if (!permitted) {
    return {
      scheduled: 0,
      error: 'Notifications permission is required for prayer reminders. Enable them in system settings.',
    };
  }

  await ensurePrayerReminderChannel();

  const pattern = weekdaysForSchedule(input.scheduleType, input.weekdays, input.startDate);
  const body = reminderNotificationBody(input.title, input.prayerPoint);
  const title = 'PrayerCare';

  let scheduled = 0;

  for (const reminder of enabledReminders) {
    const time = normalizeReminderTime(reminder.time);
    const { hour, minute } = parseReminderTime(time);
    const content: Notifications.NotificationContentInput = {
      title,
      body,
      sound: 'default',
      data: {
        prayerId: input.prayerId,
        reminderId: reminder.id,
        type: 'prayer_reminder',
      },
      ...(Platform.OS === 'android'
        ? { channelId: PRAYER_REMINDER_CHANNEL_ID }
        : { badge: 1 }),
    };

    if (pattern === 'once') {
      const date = nextDateForOnce(input.startDate, hour, minute);
      if (!date) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId(input.prayerId, reminder.id, 'once'),
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: PRAYER_REMINDER_CHANNEL_ID,
        },
      });
      scheduled += 1;
      continue;
    }

    if (pattern === 'daily') {
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId(input.prayerId, reminder.id, 'daily'),
        content: {
          ...content,
          body: `${body} (${formatReminderTimeLabel(time)})`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: PRAYER_REMINDER_CHANNEL_ID,
        },
      });
      scheduled += 1;
      continue;
    }

    for (const dow of pattern) {
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId(input.prayerId, reminder.id, `w${dow}`),
        content: {
          ...content,
          body: `${body} (${formatReminderTimeLabel(time)})`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(dow),
          hour,
          minute,
          channelId: PRAYER_REMINDER_CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
  }

  return { scheduled, error: null };
}

/** Schedule the Settings “daily prayer reminder” digest (Today list nudge). */
export async function syncDailyDigestNotification(
  enabled: boolean,
  time: string,
): Promise<{ error: string | null }> {
  if (Platform.OS === 'web') return { error: null };

  const digestId = 'pc-daily-digest';
  await Notifications.cancelScheduledNotificationAsync(digestId).catch(() => undefined);

  if (!enabled) return { error: null };

  const permitted = await ensureNotificationPermissions();
  if (!permitted) {
    return { error: 'Enable notifications to receive the daily reminder.' };
  }

  await ensurePrayerReminderChannel();
  const { hour, minute } = parseReminderTime(time);

  await Notifications.scheduleNotificationAsync({
    identifier: digestId,
    content: {
      title: 'PrayerCare',
      body: 'Time for today’s prayers.',
      sound: 'default',
      data: { type: 'daily_digest' },
      ...(Platform.OS === 'android'
        ? { channelId: PRAYER_REMINDER_CHANNEL_ID }
        : { badge: 1 }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: PRAYER_REMINDER_CHANNEL_ID,
    },
  });

  return { error: null };
}
