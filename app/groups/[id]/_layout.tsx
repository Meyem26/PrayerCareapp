import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation/stackScreenOptions';

export default function GroupDetailLayout() {
  return (
    <Stack screenOptions={stackScreenOptions()}>
      <Stack.Screen name="index" options={{ title: 'Group' }} />
      <Stack.Screen name="invite" options={{ title: 'Invite' }} />
    </Stack>
  );
}
