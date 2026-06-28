import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

function parseRecoveryTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (type !== 'recovery' || !accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrapRecoverySession(initialUrl: string | null) {
      if (!initialUrl) {
        setError('Open the reset link from your email to set a new password.');
        return;
      }

      const tokens = parseRecoveryTokens(initialUrl);
      if (!tokens) {
        setError('This reset link is invalid or has expired. Request a new one from Sign In.');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      setReady(true);
    }

    Linking.getInitialURL().then(bootstrapRecoverySession);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      bootstrapRecoverySession(url);
    });

    return () => subscription.remove();
  }, []);

  async function handleSavePassword() {
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Password updated. You can sign in with your new password.');
    setTimeout(() => router.replace('/(auth)/login'), 1500);
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AppText variant="greeting">Set a new password</AppText>
          <AppText muted>
            Choose a secure password for your PrayerCare account.
          </AppText>

          {ready ? (
            <View style={styles.form}>
              <Input
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="At least 8 characters"
              />
              <Input
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              {message ? <AppText style={styles.success}>{message}</AppText> : null}
              <Button title="Save Password" loading={loading} onPress={handleSavePassword} />
            </View>
          ) : (
            <View style={styles.form}>
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
              <Button
                title="Back to Sign In"
                variant="ghost"
                onPress={() => router.replace('/(auth)/login')}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  form: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
  },
  success: {
    color: theme.colors.accent,
  },
});
