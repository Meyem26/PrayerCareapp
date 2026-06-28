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
      setError(result.error);
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
