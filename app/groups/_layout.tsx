import { AuthGate } from '@/components/auth/AuthGate';
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation/stackScreenOptions';

export default function GroupsStackLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={stackScreenOptions()}>
        <Stack.Screen name="create" options={{ title: 'New Group' }} />
        <Stack.Screen name="join" options={{ title: 'Join Group' }} />
        <Stack.Screen name="[id]" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}
