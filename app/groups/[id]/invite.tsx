import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { inviteMemberByEmail } from '@/lib/api/groups';

export default function GroupInviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [email, setEmail] = useState('');
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
    const result = await inviteMemberByEmail(id, email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage(`Invite recorded for ${email.trim()}. They can join using the group invite code.`);
    setEmail('');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted>
          Record an email invite for your records. For now, share the group invite code directly
          so they can join immediately in the app.
        </AppText>
        <Input
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="friend@church.org"
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {message ? <AppText style={styles.success}>{message}</AppText> : null}
        <Button title="Record Invite" loading={loading} onPress={handleInvite} />
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
  },
  success: {
    color: theme.colors.accent,
  },
});
