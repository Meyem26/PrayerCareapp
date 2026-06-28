import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { LoadingScreen, Screen } from '@/components/ui/Screen';
import { AUTO_FETCH_BIBLE_TRANSLATIONS, DEFAULT_BIBLE_TRANSLATION_ID, isAutoFetchTranslation } from '@/constants/bible-translations';
import {
  DEFAULT_PRAISE_VISIBILITY_DAYS,
  PRAISE_VISIBILITY_OPTIONS,
} from '@/constants/praise-visibility';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimezoneLabel, getDeviceTimezone } from '@/lib/utils/timezone';

const STEPS = ['welcome', 'timezone', 'bible', 'praise'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const { profile, isProfileLoading, needsOnboarding, updateProfile } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [timezone, setTimezone] = useState(getDeviceTimezone());
  const [bibleTranslationId, setBibleTranslationId] = useState(DEFAULT_BIBLE_TRANSLATION_ID);
  const [praiseVisibilityDays, setPraiseVisibilityDays] = useState(DEFAULT_PRAISE_VISIBILITY_DAYS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.timezone) setTimezone(profile.timezone);
    if (profile?.bible_translation_id) {
      setBibleTranslationId(
        isAutoFetchTranslation(profile.bible_translation_id)
          ? profile.bible_translation_id
          : DEFAULT_BIBLE_TRANSLATION_ID,
      );
    }
    if (profile?.praise_visibility_days) setPraiseVisibilityDays(profile.praise_visibility_days);
  }, [profile]);

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
    <Screen>
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
              Welcome to PrayerCare
            </AppText>
            <AppText variant="greeting" style={styles.title}>
              Peace be with you, {firstName}.
            </AppText>
            <AppText muted style={styles.lead}>
              Let&apos;s take a moment to personalize your prayer journey — timezone, Scripture
              translation, and how long you&apos;d like praise to stay visible.
            </AppText>
          </View>
        ) : null}

        {step === 'timezone' ? (
          <View style={styles.step}>
            <AppText variant="greeting" style={styles.title}>
              Your timezone
            </AppText>
            <AppText muted style={styles.lead}>
              This helps your daily prayer list and reminders appear at the right time.
            </AppText>
            <OptionCard
              label={formatTimezoneLabel(timezone)}
              description="Detected from your device — you can change this later in Settings."
              selected
              onPress={() => setTimezone(getDeviceTimezone())}
            />
          </View>
        ) : null}

        {step === 'bible' ? (
          <View style={styles.step}>
            <AppText variant="greeting" style={styles.title}>
              Bible translation
            </AppText>
            <AppText muted style={styles.lead}>
              For automatic verse lookup we use free public-domain translations. You can always
              paste any translation manually when writing prayers.
            </AppText>
            <View style={styles.options}>
              {AUTO_FETCH_BIBLE_TRANSLATIONS.map((translation) => (
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
              Praise visibility
            </AppText>
            <AppText muted style={styles.lead}>
              When a prayer is answered, how long should it stay in your Praise section before
              moving to permanent History?
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
            <Button title="Back" variant="ghost" onPress={handleBack} disabled={loading} />
          ) : null}
          <Button
            title={step === 'praise' ? 'Begin My Journey' : 'Continue'}
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
