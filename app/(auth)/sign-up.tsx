import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { BETA_MODE } from '@/constants/beta';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { friendlyAuthError } from '@/lib/auth-errors';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (!displayName.trim() || !email.trim() || !password) {
      setError('Please complete all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your keys to .env.');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);

    if (result.error) {
      setError(friendlyAuthError(result.error));
      return;
    }

    if (result.session) {
      router.replace('/');
      return;
    }

    router.replace('/(auth)/verify-email');
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <AppText variant="label" accent>
              PrayerCare
            </AppText>
            <AppText variant="greeting" style={styles.greeting}>
              Begin your journey.
            </AppText>
            <AppText muted>
              Create a peaceful space to pray, care, and celebrate answered prayers.
            </AppText>
            {BETA_MODE ? (
              <View style={styles.betaSteps}>
                <AppText variant="label" accent style={styles.betaStepsTitle}>
                  Quick start
                </AppText>
                <AppText variant="bodySmall" style={styles.betaStep}>
                  1. You were invited to try PrayerCare
                </AppText>
                <AppText variant="bodySmall" style={styles.betaStep}>
                  2. Create your account here with your email
                </AppText>
                <AppText variant="bodySmall" style={styles.betaStep}>
                  3. Sign in anytime after that
                </AppText>
              </View>
            ) : (
              <AppText variant="bodySmall" muted style={styles.freeNote}>
                PrayerCare is free. Create your account to get started.
              </AppText>
            )}
          </View>

          <View style={styles.form}>
            <Input
              label="Your name"
              autoComplete="name"
              textContentType="name"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Input
              label="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title="Create Account" loading={loading} onPress={handleSignUp} />
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.link}>
              <AppText muted>
                Already have an account? <AppText accent>Sign in</AppText>
              </AppText>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
  },
  hero: {
    gap: theme.spacing.sm,
  },
  freeNote: {
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  betaSteps: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  betaStepsTitle: {
    marginBottom: theme.spacing.xs,
  },
  betaStep: {
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  greeting: {
    marginTop: theme.spacing.xs,
  },
  form: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
  },
  link: {
    alignItems: 'center',
  },
});
