import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  ensureNotificationPermissions,
  ensurePrayerReminderChannel,
} from '@/lib/notifications/permissions';
import { supabase } from '@/lib/supabase';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const granted = await ensureNotificationPermissions();
  if (!granted) {
    return null;
  }

  await ensurePrayerReminderChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      'Push notifications need an EAS projectId in app.json (extra.eas.projectId). Skipping token registration.',
    );
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResult.data;
    const deviceId = Constants.installationId ?? `${Platform.OS}-${Device.modelName ?? 'device'}`;
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        device_id: deviceId,
        platform,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' },
    );

    if (error) {
      console.warn('Failed to save push token:', error.message);
    }

    return expoPushToken;
  } catch (error) {
    console.warn('Push token registration skipped:', error);
    return null;
  }
}
