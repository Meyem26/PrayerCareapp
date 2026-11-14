import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useI18n } from '@/contexts/I18nContext';
import { acceptGroupInviteByToken, joinGroupByCode } from '@/lib/api/groups';

export default function JoinGroupScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ code?: string; token?: string }>();
  const [code, setCode] = useState(typeof params.code === 'string' ? params.code : '');
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
          setError(joinError ?? t('groups.linkFailed'));
          return;
        }
        router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
        return;
      }

      const { data, error: joinError } = await joinGroupByCode(incomingCode);
      if (cancelled) return;
      setAutoJoining(false);
      if (joinError || !data) {
        setError(joinError ?? t('groups.linkCodeFailed'));
        return;
      }
      router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
    }

    autoJoin();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.token, t]);

  async function handleJoin() {
    setError(null);

    if (!code.trim()) {
      setError(t('groups.needCode'));
      return;
    }

    setLoading(true);
    const { data, error: joinError } = await joinGroupByCode(code);
    setLoading(false);

    if (joinError || !data) {
      setError(joinError ?? t('groups.joinFailed'));
      return;
    }

    router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted>{t('groups.joinHint')}</AppText>

        {autoJoining ? <AppText muted>{t('groups.joiningLink')}</AppText> : null}

        {!autoJoining ? (
          <>
            <Input
              label={t('groups.inviteCode')}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              placeholder={t('groups.inviteCodePlaceholder')}
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title={t('groups.joinAction')} loading={loading} onPress={handleJoin} />
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
