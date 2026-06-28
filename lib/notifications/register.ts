import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getDeviceId(): string {
  return Constants.installationId ?? `${Platform.OS}-${Device.modelName ?? 'device'}`;
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      'Push notifications need an EAS projectId in app.json (extra.eas.projectId). Skipping token registration.',
    );
    return null;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResult.data;
  const deviceId = getDeviceId();
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'PrayerCare',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return expoPushToken;
}
