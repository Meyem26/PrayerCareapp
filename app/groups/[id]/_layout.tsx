import { Stack } from 'expo-router';

import { theme } from '@/constants/theme';

export default function GroupDetailLayout() {
  return (
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
      <Stack.Screen name="index" options={{ title: 'Group' }} />
      <Stack.Screen name="invite" options={{ title: 'Invite' }} />
    </Stack>
  );
}
