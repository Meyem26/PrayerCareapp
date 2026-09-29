import { AuthGate } from '@/components/auth/AuthGate';
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/navigation/stackScreenOptions';

export default function SermonLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={stackScreenOptions()}>
        <Stack.Screen name="create" options={{ title: 'New Sermon Note', presentation: 'modal' }} />
        <Stack.Screen name="[id]" options={{ title: 'Sermon Note' }} />
      </Stack>
    </AuthGate>
  );
}
