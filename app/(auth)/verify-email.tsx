import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const paramEmail = useMemo(() => {
    const raw = params.email;
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() || null;
  }, [params.email]);

  const { user, isEmailVerified, resendVerificationEmail, refreshSession, signOut } = useAuth();
  const email = user?.email ?? paramEmail;

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isEmailVerified) {
      router.replace('/');
    }
  }, [isEmailVerified]);

  async function handleResend() {
    setMessage(null);
    setError(null);

    if (!email) {
      setError('Please go back and sign up again so we know which email to verify.');
      return;
    }

    setLoading(true);
    const result = await resendVerificationEmail(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage('Verification email sent. Please check your inbox and spam folder.');
  }

  async function handleCheckVerified() {
    setError(null);
    setMessage(null);
    setChecking(true);

    const result = await refreshSession();
    if (result.error) {
      // No session yet is normal before the link is clicked — probe getUser/getSession.
      const { data } = await supabase.auth.getSession();
      setChecking(false);
      if (data.session?.user?.email_confirmed_at) {
        router.replace('/');
        return;
      }
      setMessage('Email not verified yet. Open the link in your email, then tap this button again.');
      return;
    }

    setChecking(false);

    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email_confirmed_at) {
      router.replace('/');
      return;
    }

    setMessage('Email not verified yet. Open the link in your email, then tap this button again.');
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <Screen centered safe>
      <View style={styles.content}>
        <AppText variant="greeting" style={styles.title}>
          Verify your email
        </AppText>
        <AppText muted style={styles.body}>
          We sent a confirmation link to{' '}
          <AppText accent>{email ?? 'your email'}</AppText>.
          {'\n\n'}
          Open that link to activate your account. Check spam if you do not see it within a few
          minutes.
          {'\n\n'}
          After you confirm, return here and tap “I verified my email,” or open PrayerCare again.
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
