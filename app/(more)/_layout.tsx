import { AuthGate } from '@/components/auth/AuthGate';
import { Stack } from 'expo-router';

import { theme } from '@/constants/theme';

export default function MoreLayout() {
  return (
    <AuthGate>
      <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 17,
          fontWeight: '600',
        },
        headerTintColor: theme.colors.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="sermon-notes" options={{ title: 'Sermon Notes' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
    </Stack>
    </AuthGate>
  );
}
