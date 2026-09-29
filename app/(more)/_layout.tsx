import { AuthGate } from '@/components/auth/AuthGate';
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation/stackScreenOptions';

export default function MoreLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={stackScreenOptions({ animation: 'slide_from_right' })}>
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="sermon-notes" options={{ title: 'Sermon Notes' }} />
        <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      </Stack>
    </AuthGate>
  );
}
