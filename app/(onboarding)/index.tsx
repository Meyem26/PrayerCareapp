import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { LoadingScreen, Screen } from '@/components/ui/Screen';
import {
  DEFAULT_BIBLE_TRANSLATION_ID,
  getAutoFetchTranslationsForLocale,
  isAutoFetchTranslation,
  resolveBibleTranslationForLocaleChange,
} from '@/constants/bible-translations';
import { normalizeAppLocale } from '@/constants/languages';
import {
  DEFAULT_PRAISE_VISIBILITY_DAYS,
  PRAISE_VISIBILITY_OPTIONS,
} from '@/constants/praise-visibility';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { formatTimezoneLabel, getDeviceTimezone } from '@/lib/utils/timezone';

const STEPS = ['welcome', 'timezone', 'bible', 'praise'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const { profile, isProfileLoading, needsOnboarding, updateProfile } = useAuth();
  const { t } = useI18n();
  const locale = normalizeAppLocale(profile?.locale);
  const bibleOptions = getAutoFetchTranslationsForLocale(locale);
  const [step, setStep] = useState<Step>('welcome');
  const [timezone, setTimezone] = useState(getDeviceTimezone());
  const [bibleTranslationId, setBibleTranslationId] = useState(
    resolveBibleTranslationForLocaleChange(DEFAULT_BIBLE_TRANSLATION_ID, locale).translationId,
  );
  const [praiseVisibilityDays, setPraiseVisibilityDays] = useState(DEFAULT_PRAISE_VISIBILITY_DAYS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.timezone) setTimezone(profile.timezone);
    if (profile?.bible_translation_id) {
      const preferred = isAutoFetchTranslation(profile.bible_translation_id)
        ? profile.bible_translation_id
        : DEFAULT_BIBLE_TRANSLATION_ID;
      setBibleTranslationId(
        resolveBibleTranslationForLocaleChange(preferred, locale).translationId,
      );
    } else {
      setBibleTranslationId(
        resolveBibleTranslationForLocaleChange(DEFAULT_BIBLE_TRANSLATION_ID, locale).translationId,
      );
    }
    if (profile?.praise_visibility_days) setPraiseVisibilityDays(profile.praise_visibility_days);
  }, [profile, locale]);

  if (isProfileLoading) {
    return <LoadingScreen />;
  }

  if (!needsOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  const stepIndex = STEPS.indexOf(step);
  const firstName = profile?.display_name?.split(' ')[0] ?? 'Friend';

  async function handleComplete() {
    setError(null);
    setLoading(true);

    const result = await updateProfile({
      timezone,
      bible_translation_id: bibleTranslationId,
      praise_visibility_days: praiseVisibilityDays,
      onboarding_completed_at: new Date().toISOString(),
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace('/(tabs)');
  }

  function handleNext() {
    if (step === 'praise') {
      handleComplete();
      return;
    }

    const nextStep = STEPS[stepIndex + 1];
    setStep(nextStep);
  }

  function handleBack() {
    if (stepIndex === 0) return;
    setStep(STEPS[stepIndex - 1]);
  }

  return (
    <Screen safe>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          {STEPS.map((s, index) => (
            <View
              key={s}
              style={[styles.dot, index <= stepIndex ? styles.dotActive : null]}
            />
          ))}
        </View>

        {step === 'welcome' ? (
          <View style={styles.step}>
            <AppText variant="label" accent>
              {t('brand.name')}
            </AppText>
            <AppText variant="greeting" style={styles.title}>
              {t('onboarding.welcomeTitle', { name: firstName })}
            </AppText>
            <AppText muted style={styles.lead}>
              {t('onboarding.welcomeBody')}
            </AppText>
          </View>
        ) : null}

        {step === 'timezone' ? (
          <View style={styles.step}>
            <AppText variant="greeting" style={styles.title}>
              {t('onboarding.timezoneTitle')}
            </AppText>
            <AppText muted style={styles.lead}>
              {t('onboarding.timezoneBody')}
            </AppText>
            <OptionCard
              label={formatTimezoneLabel(timezone)}
              description={t('settings.timezoneHint')}
              selected
              onPress={() => setTimezone(getDeviceTimezone())}
            />
          </View>
        ) : null}

        {step === 'bible' ? (
          <View style={styles.step}>
            <AppText variant="greeting" style={styles.title}>
              {t('onboarding.bibleTitle')}
            </AppText>
            <AppText muted style={styles.lead}>
              {t('onboarding.bibleBody')}
            </AppText>
            <View style={styles.options}>
              {bibleOptions.map((translation) => (
                <OptionCard
                  key={translation.id}
                  label={translation.label}
                  description={translation.description}
                  selected={bibleTranslationId === translation.id}
                  onPress={() => setBibleTranslationId(translation.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 'praise' ? (
          <View style={styles.step}>
            <AppText variant="greeting" style={styles.title}>
              {t('onboarding.praiseTitle')}
            </AppText>
            <AppText muted style={styles.lead}>
              {t('onboarding.praiseBody')}
            </AppText>
            <View style={styles.options}>
              {PRAISE_VISIBILITY_OPTIONS.map((option) => (
                <OptionCard
                  key={option.days}
                  label={option.label}
                  description={option.description}
                  selected={praiseVisibilityDays === option.days}
                  onPress={() => setPraiseVisibilityDays(option.days)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <View style={styles.actions}>
          {stepIndex > 0 ? (
            <Button title={t('common.back')} variant="ghost" onPress={handleBack} disabled={loading} />
          ) : null}
          <Button
            title={step === 'praise' ? t('onboarding.finish') : t('common.continue')}
            loading={loading}
            onPress={handleNext}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
  },
  step: {
    gap: theme.spacing.md,
  },
  title: {
    marginTop: theme.spacing.xs,
  },
  lead: {
    marginBottom: theme.spacing.sm,
  },
  options: {
    gap: theme.spacing.sm,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
