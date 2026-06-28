import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  async function handleSave() {
    setMessage(null);
    setError(null);

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    const result = await updateProfile({ display_name: displayName.trim() });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage('Profile updated.');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted style={styles.lead}>
          Your name appears in greetings and when you share prayers with others.
        </AppText>

        <Input label="Display name" value={displayName} onChangeText={setDisplayName} />
        <Input label="Email" value={user?.email ?? ''} editable={false} />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {message ? <AppText style={styles.success}>{message}</AppText> : null}

        <Button title="Save Changes" loading={loading} onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  lead: {
    marginBottom: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
  },
  success: {
    color: theme.colors.accent,
  },
});
