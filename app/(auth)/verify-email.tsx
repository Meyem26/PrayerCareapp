import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function VerifyEmailScreen() {
  const { user, isEmailVerified, resendVerificationEmail, refreshSession, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isEmailVerified) {
      router.replace('/(tabs)');
    }
  }, [isEmailVerified]);

  async function handleResend() {
    setMessage(null);
    setError(null);
    setLoading(true);
    const result = await resendVerificationEmail();
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage('Verification email sent. Please check your inbox.');
  }

  async function handleCheckVerified() {
    setError(null);
    setMessage(null);
    setChecking(true);
    const result = await refreshSession();
    setChecking(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email_confirmed_at) {
      router.replace('/(tabs)');
      return;
    }

    setMessage('Email not verified yet. Check your inbox and try again in a moment.');
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen centered>
      <View style={styles.content}>
        <AppText variant="greeting" style={styles.title}>
          Verify your email
        </AppText>
        <AppText muted style={styles.body}>
          We sent a confirmation link to{' '}
          <AppText accent>{user?.email ?? 'your email'}</AppText>.
          {'\n\n'}
          Check your inbox and spam folder. If nothing arrives in a few minutes, tap Resend
          Email below or contact the PrayerCare team for help.
          {'\n\n'}
          Once verified, you can begin your prayer journey.
        </AppText>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {message ? <AppText style={styles.success}>{message}</AppText> : null}

        <Button title="Resend Email" loading={loading} onPress={handleResend} />
        <Button
          title="I verified my email"
          variant="secondary"
          loading={checking}
          onPress={handleCheckVerified}
        />

        <Pressable onPress={handleSignOut} style={styles.link}>
          <AppText muted>Use a different account</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: theme.spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  success: {
    color: theme.colors.accent,
    textAlign: 'center',
  },
  link: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
});
