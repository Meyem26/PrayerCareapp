import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const PRAYER_REMINDER_CHANNEL_ID = 'prayer-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function ensurePrayerReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(PRAYER_REMINDER_CHANNEL_ID, {
    name: 'Prayer reminders',
    description: 'Reminders for prayers you scheduled in PrayerCare',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });

  // Keep legacy channel for any older scheduled notifications
  await Notifications.setNotificationChannelAsync('default', {
    name: 'PrayerCare',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });
}
