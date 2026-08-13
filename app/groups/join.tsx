import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { acceptGroupInviteByToken, joinGroupByCode } from '@/lib/api/groups';

export default function JoinGroupScreen() {
  const params = useLocalSearchParams<{ code?: string; token?: string }>();
  const [code, setCode] = useState(
    typeof params.code === 'string' ? params.code : '',
  );
  const [loading, setLoading] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);

  useEffect(() => {
    const incomingCode = typeof params.code === 'string' ? params.code.trim() : '';
    const incomingToken = typeof params.token === 'string' ? params.token.trim() : '';

    if (incomingCode) setCode(incomingCode);
    if ((!incomingToken && !incomingCode) || autoTried.current) return;
    autoTried.current = true;

    let cancelled = false;

    async function autoJoin() {
      setAutoJoining(true);
      setError(null);

      if (incomingToken) {
        const { data, error: joinError } = await acceptGroupInviteByToken(incomingToken);
        if (cancelled) return;
        setAutoJoining(false);
        if (joinError || !data) {
          setError(
            joinError ??
              'Could not accept this invite link. You can still join with a code below.',
          );
          return;
        }
        router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
        return;
      }

      const { data, error: joinError } = await joinGroupByCode(incomingCode);
      if (cancelled) return;
      setAutoJoining(false);
      if (joinError || !data) {
        setError(joinError ?? 'Could not join with this link. Check the code and try again.');
        return;
      }
      router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
    }

    autoJoin();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.token]);

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
          Enter the invite code shared by your group leader, or open an invite link from your
          email. Groups are private — no one can browse or discover them.
        </AppText>

        {autoJoining ? <AppText muted>Joining from your invite link…</AppText> : null}

        {!autoJoining ? (
          <>
            <Input
              label="Invite code"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              placeholder="e.g. a1b2c3"
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title="Join Group" loading={loading} onPress={handleJoin} />
          </>
        ) : null}
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
