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

type RecoveryPayload =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string };

function readSearchAndHash(url: string): { search: string; hash: string } {
  try {
    const parsed = new URL(url);
    return {
      search: parsed.search.startsWith('?') ? parsed.search.slice(1) : parsed.search,
      hash: parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash,
    };
  } catch {
    const hash = url.includes('#') ? url.split('#')[1] ?? '' : '';
    const withoutHash = url.split('#')[0] ?? '';
    const search = withoutHash.includes('?') ? withoutHash.split('?')[1] ?? '' : '';
    return { search, hash };
  }
}

function parseRecoveryPayload(url: string): RecoveryPayload | null {
  const { search, hash } = readSearchAndHash(url);
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(search);

  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
  const type = hashParams.get('type') ?? queryParams.get('type');

  if (type === 'recovery' && accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }

  const code = queryParams.get('code') ?? hashParams.get('code');
  if (code) {
    return { kind: 'code', code };
  }

  const tokenHash = queryParams.get('token_hash') ?? hashParams.get('token_hash');
  if (tokenHash && (type === 'recovery' || !type)) {
    return { kind: 'token_hash', tokenHash };
  }

  return null;
}

function getBootstrapUrl(): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Linking.getInitialURL() on web often omits the #access_token fragment.
    return window.location.href;
  }
  return null;
}

function clearRecoveryParamsFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, window.location.pathname || '/reset-password');
}

async function establishRecoverySession(url: string): Promise<string | null> {
  const payload = parseRecoveryPayload(url);

  if (payload?.kind === 'tokens') {
    const { error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });
    return error?.message ?? null;
  }

  if (payload?.kind === 'code') {
    const { error } = await supabase.auth.exchangeCodeForSession(payload.code);
    return error?.message ?? null;
  }

  if (payload?.kind === 'token_hash') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: payload.tokenHash,
      type: 'recovery',
    });
    return error?.message ?? null;
  }

  // detectSessionInUrl may already have created a recovery session from the hash.
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return null;
  }

  return 'This reset link is invalid or has expired. Request a new one from Sign In.';
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(url: string | null) {
      setBootstrapping(true);
      setError(null);

      if (!url) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setReady(true);
          setBootstrapping(false);
          return;
        }
        setError('Open the reset link from your email to set a new password.');
        setBootstrapping(false);
        return;
      }

      const sessionError = await establishRecoverySession(url);
      if (cancelled) return;

      if (sessionError) {
        setReady(false);
        setError(sessionError);
        setBootstrapping(false);
        return;
      }

      clearRecoveryParamsFromUrl();
      setReady(true);
      setBootstrapping(false);
    }

    const webUrl = getBootstrapUrl();
    if (webUrl) {
      bootstrap(webUrl);
    } else {
      Linking.getInitialURL().then((url) => bootstrap(url));
    }

    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      bootstrap(url);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setError(null);
        setBootstrapping(false);
        clearRecoveryParamsFromUrl();
      }
    });

    return () => {
      cancelled = true;
      linkingSub.remove();
      authSub.subscription.unsubscribe();
    };
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
          <AppText muted>Choose a secure password for your PrayerCare account.</AppText>

          {bootstrapping ? (
            <AppText muted>Checking your reset link…</AppText>
          ) : ready ? (
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
