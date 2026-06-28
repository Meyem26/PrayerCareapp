import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { joinGroupByCode } from '@/lib/api/groups';

export default function JoinGroupScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);

    if (!code.trim()) {
      setError('Please enter an invite code.');
      return;
    }

    setLoading(true);
    const { data, error: joinError } = await joinGroupByCode(code);
    setLoading(false);

    if (joinError || !data) {
      setError(joinError ?? 'Could not join group.');
      return;
    }

    router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted>
          Enter the invite code shared by your group leader. Groups are private — no one can
          browse or discover them.
        </AppText>
        <Input
          label="Invite code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          placeholder="e.g. a1b2c3"
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button title="Join Group" loading={loading} onPress={handleJoin} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
