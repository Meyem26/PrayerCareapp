import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { generatePrayerWithAi } from '@/lib/api/ai';
import { consumePrayerSaved, setAiPrayerDraft } from '@/lib/ai-draft-store';

export default function PrayScreen() {
  const { profile } = useAuth();
  const { t, locale } = useI18n();
  const [heart, setHeart] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (consumePrayerSaved()) {
        setHeart('');
        setError(null);
      }
    }, []),
  );

  function handleWriteOwn() {
    router.push({
      pathname: '/prayer/create',
      params: heart.trim() ? { heart: heart.trim() } : {},
    });
  }

  async function handleGenerateAi() {
    setError(null);

    if (!heart.trim()) {
      setError(t('pray.needHeart'));
      return;
    }

    setLoading(true);

    const { data, error: aiError } = await generatePrayerWithAi(
      heart.trim(),
      profile?.bible_translation_id,
      locale,
    );

    setLoading(false);

    if (aiError || !data) {
      setError(aiError ?? t('pray.generateFailed'));
      return;
    }

    setAiPrayerDraft({
      ...data,
      // Store original heart for ai_prompt_snapshot on save
    });

    router.push({
      pathname: '/prayer/create',
      params: { source: 'ai', heart: heart.trim() },
    });
  }

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppText variant="greeting">{t('pray.title')}</AppText>
        <AppText muted>{t('pray.subtitle')}</AppText>

        <TextArea
          label={t('pray.heartLabel')}
          value={heart}
          onChangeText={setHeart}
          editable={!loading}
          placeholder={t('pray.heartPlaceholder')}
        />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.accent} />
            <AppText muted style={styles.loadingText}>
              {t('pray.preparing')}
            </AppText>
          </View>
        ) : null}

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <View style={styles.actions}>
          <Button title={t('pray.generateAi')} loading={loading} onPress={handleGenerateAi} />
          <Button
            title={t('pray.writeOwn')}
            variant="secondary"
            disabled={loading}
            onPress={handleWriteOwn}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  loadingBox: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
