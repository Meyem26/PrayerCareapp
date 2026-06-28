import { AuthGate } from '@/components/auth/AuthGate';
import { Stack } from 'expo-router';

import { theme } from '@/constants/theme';

export default function PrayerLayout() {
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
      }}>
      <Stack.Screen name="create" options={{ title: 'New Prayer', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Prayer' }} />
    </Stack>
    </AuthGate>
  );
}
