import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your keys to .env.');
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      const lower = result.error.toLowerCase();
      if (lower.includes('invalid login credentials')) {
        setError(
          'Email or password did not match. If you joined the beta but have not created an account yet, tap Create an account below — joining the beta is not the same as signing up in the app.',
        );
      } else if (lower.includes('email not confirmed')) {
        setError(
          'Please confirm your email first. Check your inbox and spam for a message from PrayerCare, or ask us to resend the verification link.',
        );
      } else {
        setError(result.error);
      }
      return;
    }

    router.replace('/');
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
              Welcome back.
            </AppText>
            <AppText muted>
              Sign in to continue your prayer journey.
            </AppText>
            <AppText variant="bodySmall" muted style={styles.betaNote}>
              First time here? Join the beta on our website, then tap Create an account below
              using the same email.
            </AppText>
          </View>

          <View style={styles.form}>
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
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title="Sign In" loading={loading} onPress={handleLogin} />
          </View>

          <View style={styles.links}>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <AppText accent>Forgot password?</AppText>
              </Pressable>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <AppText muted>
                  New here? <AppText accent>Create an account</AppText>
                </AppText>
              </Pressable>
            </Link>
          </View>
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
  greeting: {
    marginTop: theme.spacing.xs,
  },
  betaNote: {
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  form: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
  },
  links: {
    gap: theme.spacing.md,
    alignItems: 'center',
  },
});
