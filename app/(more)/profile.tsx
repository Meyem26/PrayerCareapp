import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAccount } from '@/lib/api/account';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDeleteAccount() {
    setError(null);
    setDeleting(true);

    const result = await deleteAccount();
    if (result.error) {
      setDeleting(false);
      setConfirmDeleteVisible(false);
      setError(result.error);
      return;
    }

    try {
      await signOut();
    } catch {
      /* session may already be invalid after deletion */
    }

    setDeleting(false);
    setConfirmDeleteVisible(false);
    router.replace('/(auth)/login');
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

        <View style={styles.dangerZone}>
          <AppText variant="title" style={styles.dangerTitle}>
            Delete account
          </AppText>
          <AppText muted style={styles.dangerBody}>
            Permanently delete your PrayerCare account and personal data. Groups you own alone are
            removed. Groups with other members transfer to another member. Shared group prayers you
            created stay with the group. This cannot be undone.
          </AppText>
          <Button
            title="Delete Account"
            variant="secondary"
            onPress={() => {
              setError(null);
              setConfirmDeleteVisible(true);
            }}
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete your account?"
        message="This permanently deletes your account, personal prayers, sermon notes, and settings. Shared group content you created may remain with the group under a new owner. This cannot be undone."
        confirmLabel="Delete forever"
        cancelLabel="Keep account"
        destructive
        loading={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDeleteVisible(false);
        }}
        onConfirm={handleDeleteAccount}
      />
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
  dangerZone: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  dangerTitle: {
    color: theme.colors.error,
  },
  dangerBody: {
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
});
