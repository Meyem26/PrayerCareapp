import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LanguagePicker } from '@/components/i18n/LanguagePicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { getDefaultBibleTranslationId, type AppLocale } from '@/constants/languages';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { friendlyAuthError } from '@/lib/auth-errors';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function SignUpScreen() {
  const { signUp, updateProfile } = useAuth();
  const { t, locale, setGuestLocale } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);

    if (!displayName.trim() || !email.trim() || !password) {
      setError(t('auth.completeAllFields'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (!isSupabaseConfigured) {
      setError(t('auth.supabaseMissing'));
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, displayName.trim(), locale as AppLocale);
    setLoading(false);

    if (result.error) {
      console.warn('Sign up failed:', result.error);
      setError(friendlyAuthError(result.error));
      return;
    }

    if (result.needsEmailVerification) {
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: email.trim() },
      });
      return;
    }

    // Immediate session (e.g. local/dev): ensure locale + matching Bible preference stick.
    await updateProfile({
      locale: locale as AppLocale,
      bible_translation_id: getDefaultBibleTranslationId(locale as AppLocale),
    });

    router.replace('/');
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
              {t('auth.beginJourney')}
            </AppText>
            <AppText muted>{t('auth.createPeaceful')}</AppText>
            <AppText variant="bodySmall" muted style={styles.freeNote}>
              {t('auth.freeNote')}
            </AppText>
          </View>

          <LanguagePicker
            value={locale as AppLocale}
            onChange={setGuestLocale}
            title={t('language.title')}
            subtitle={t('language.subtitle')}
          />

          <View style={styles.form}>
            <Input
              label={t('auth.yourName')}
              autoComplete="name"
              textContentType="name"
              value={displayName}
              onChangeText={setDisplayName}
            />
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
              autoComplete="new-password"
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
            />
            {error ? <AppText style={styles.error}>{error}</AppText> : null}
            <Button title={t('auth.signUp')} loading={loading} onPress={handleSignUp} />
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.link}>
              <AppText muted>
                {t('auth.alreadyHaveAccount')} <AppText accent>{t('auth.signIn')}</AppText>
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
