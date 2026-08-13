import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { inviteMemberByEmail } from '@/lib/api/groups';

export default function GroupInviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [email, setEmail] = useState('');
  const [requireCode, setRequireCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite() {
    setError(null);
    setMessage(null);

    if (!email.trim() || !id) {
      setError('Please enter an email address.');
      return;
    }

    setLoading(true);
    const result = await inviteMemberByEmail(id, email, {
      requireCode,
      sendEmail: true,
    });
    setLoading(false);

    if (result.error && !result.inviteId) {
      setError(result.error);
      return;
    }

    if (result.error && result.inviteId) {
      setError(result.error);
      setMessage(
        requireCode
          ? 'Invite was saved. Share the group join link or code until email sending is fixed.'
          : 'Invite was saved. They will also see it under Groups → Invitations when signed in with this email.',
      );
      setEmail('');
      return;
    }

    setMessage(
      requireCode
        ? `Invite emailed to ${email.trim()}. They must use the invite code (or the code link) to join.`
        : `Invite emailed to ${email.trim()}. Their link is enough — and they’ll see an invitation under Groups.`,
    );
    setEmail('');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted>
          Send an email invitation. They can open the link in the app, and pending invites also
          appear on their Groups screen when they sign in with that email.
        </AppText>

        <Input
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="friend@church.org"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText>Require invite code</AppText>
            <AppText variant="bodySmall" muted>
              Off = link alone is enough. On = they must enter the group code (link can still
              pre-fill it).
            </AppText>
          </View>
          <Switch
            value={requireCode}
            onValueChange={setRequireCode}
            trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
            thumbColor={requireCode ? theme.colors.accent : theme.colors.surface}
          />
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {message ? <AppText style={styles.success}>{message}</AppText> : null}
        <Button title="Send invite" loading={loading} onPress={handleInvite} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
  error: {
    color: theme.colors.error,
  },
  success: {
    color: theme.colors.accent,
  },
});
