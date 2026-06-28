import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { generatePrayerWithAi } from '@/lib/api/ai';
import { setAiPrayerDraft } from '@/lib/ai-draft-store';

export default function PrayScreen() {
  const { profile } = useAuth();
  const [heart, setHeart] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleWriteOwn() {
    router.push({
      pathname: '/prayer/create',
      params: heart.trim() ? { heart: heart.trim() } : {},
    });
  }

  async function handleGenerateAi() {
    setError(null);

    if (!heart.trim()) {
      setError('Please share what is on your heart first.');
      return;
    }

    setLoading(true);

    const { data, error: aiError } = await generatePrayerWithAi(
      heart.trim(),
      profile?.bible_translation_id,
    );

    setLoading(false);

    if (aiError || !data) {
      setError(aiError ?? 'Could not generate prayer. Please try again.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AppText variant="greeting">What&apos;s on your heart today?</AppText>
          <AppText muted>
            Share naturally. AI will draft a biblical prayer in Jesus&apos; name — everything
            remains fully editable.
          </AppText>

          <TextArea
            label="Your heart"
            value={heart}
            onChangeText={setHeart}
            editable={!loading}
            placeholder="Health, family, guidance, a loved one, a ministry need..."
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.colors.accent} />
              <AppText muted style={styles.loadingText}>
                Preparing a prayer grounded in Scripture...
              </AppText>
            </View>
          ) : null}

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <View style={styles.actions}>
            <Button
              title="Generate with AI"
              loading={loading}
              onPress={handleGenerateAi}
            />
            <Button
              title="Write my own prayer"
              variant="secondary"
              disabled={loading}
              onPress={handleWriteOwn}
            />
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
