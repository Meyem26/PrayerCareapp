import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingScreen, Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { theme } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const { signIn, session, isLoading, isEmailVerified, needsOnboarding } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!session) return;

    if (!isEmailVerified) {
      router.replace('/(auth)/verify-email');
      return;
    }
    if (needsOnboarding) {
      router.replace('/(onboarding)');
      return;
    }
    router.replace('/(tabs)');
  }, [isLoading, session, isEmailVerified, needsOnboarding]);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError(t('auth.completeAllFields'));
      return;
    }

    if (!isSupabaseConfigured) {
      setError(t('auth.supabaseMissing'));
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      const lower = result.error.toLowerCase();
      if (lower.includes('invalid login credentials')) {
        setError(
          'Email or password did not match. If you do not have an account yet, tap Create an account below.',
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

  if (isLoading || session) {
    return <LoadingScreen />;
  }

  return (
    <Screen safe>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <AppText variant="label" accent>
              {t('brand.name')}
            </AppText>
            <AppText variant="greeting" style={styles.greeting}>
              {t('auth.welcomeBack')}
            </AppText>
            <AppText muted>{t('auth.signInSubtitle')}</AppText>
            <AppText variant="bodySmall" muted style={styles.hintNote}>
              {t('auth.needAccount')} {t('auth.createOne')}
            </AppText>
          </View>

          <View style={styles.form}>
            <Input
              label={t('auth.email')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label={t('auth.password')}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title={t('auth.signIn')} loading={loading} onPress={handleLogin} />
          </View>

          <View style={styles.links}>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <AppText accent>{t('auth.forgotPassword')}</AppText>
              </Pressable>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <AppText muted>
                  {t('auth.needAccount')} <AppText accent>{t('auth.createOne')}</AppText>
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
  hintNote: {
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
