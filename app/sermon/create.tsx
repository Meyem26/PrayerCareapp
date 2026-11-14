import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { fetchScriptureFromApi } from '@/lib/api/bible';
import { createSermonNote } from '@/lib/api/sermon';
import { getTodayDateString } from '@/lib/utils/date';
import type { FetchedScripture } from '@/types/sermon';

function parseReferences(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

type VersePreview = {
  reference: string;
  text?: string;
  error?: string;
  translationId?: string;
};

export default function CreateSermonNoteScreen() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [church, setChurch] = useState('');
  const [referencesRaw, setReferencesRaw] = useState('');
  const [meditation, setMeditation] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingVerses, setFetchingVerses] = useState(false);
  const [versePreviews, setVersePreviews] = useState<VersePreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchVerses() {
    setError(null);
    setVersePreviews([]);

    const references = parseReferences(referencesRaw);
    if (references.length === 0) {
      setError(t('sermon.needReference'));
      return;
    }

    if (!profile) {
      setError(t('prayer.mustSignIn'));
      return;
    }

    setFetchingVerses(true);
    const previews: VersePreview[] = [];

    for (const reference of references) {
      const { data, error: fetchError } = await fetchScriptureFromApi(
        reference,
        profile.bible_translation_id,
      );

      if (fetchError || !data) {
        previews.push({ reference, error: fetchError ?? t('sermon.fetchFailed') });
        continue;
      }

      previews.push({
        reference: (data as FetchedScripture).reference,
        text: (data as FetchedScripture).text,
        translationId: (data as FetchedScripture).translation_id,
      });
    }

    setVersePreviews(previews);
    setFetchingVerses(false);
  }

  async function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError(t('sermon.needTitle'));
      return;
    }

    if (!profile) {
      setError(t('prayer.mustSignIn'));
      return;
    }

    setLoading(true);
    const result = await createSermonNote({
      title,
      speaker,
      church,
      sermonDate: getTodayDateString(profile.timezone),
      references: parseReferences(referencesRaw),
      meditationNotes: meditation,
      translationId: profile.bible_translation_id,
    });
    setLoading(false);

    if (result.error && !result.data) {
      setError(result.error);
      return;
    }

    if (result.data) {
      router.replace({ pathname: '/sermon/[id]', params: { id: result.data.id } });
    }
  }

  return (
    <Screen padded={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <AppText variant="greeting">{t('sermon.captureTitle')}</AppText>
            <AppText muted>{t('sermon.captureSubtitle')}</AppText>
          </View>

          <Input
            label={t('sermon.titleLabel')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('sermon.titlePlaceholder')}
          />
          <Input
            label={t('sermon.speaker')}
            value={speaker}
            onChangeText={setSpeaker}
            placeholder={t('sermon.optional')}
          />
          <Input
            label={t('sermon.church')}
            value={church}
            onChangeText={setChurch}
            placeholder={t('sermon.optional')}
          />

          <TextArea
            label={t('sermon.references')}
            value={referencesRaw}
            onChangeText={(value) => {
              setReferencesRaw(value);
              setVersePreviews([]);
            }}
            placeholder={t('sermon.referencesPlaceholder')}
            style={styles.referencesArea}
          />

          <Button
            title={t('sermon.fetchVerses')}
            variant="secondary"
            loading={fetchingVerses}
            onPress={handleFetchVerses}
          />

          {versePreviews.length > 0 ? (
            <View style={styles.previewBlock}>
              <AppText variant="title">{t('sermon.preview')}</AppText>
              {versePreviews.map((preview) => (
                <View key={preview.reference} style={styles.previewItem}>
                  <AppText style={styles.previewReference}>{preview.reference}</AppText>
                  {preview.text ? (
                    <>
                      <AppText style={styles.previewText}>{preview.text}</AppText>
                      {preview.translationId ? (
                        <AppText variant="bodySmall" muted>
                          {preview.translationId}
                        </AppText>
                      ) : null}
                    </>
                  ) : (
                    <AppText style={styles.previewError}>{preview.error}</AppText>
                  )}
                </View>
              ))}
            </View>
          ) : null}

          <TextArea
            label={t('sermon.meditation')}
            value={meditation}
            onChangeText={setMeditation}
            placeholder={t('sermon.meditationPlaceholder')}
            style={styles.meditationArea}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <Button title={t('sermon.save')} loading={loading} onPress={handleSave} />
        </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    gap: theme.spacing.sm,
  },
  referencesArea: {
    minHeight: 100,
  },
  previewBlock: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  previewItem: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  previewReference: {
    fontWeight: '600',
    color: theme.colors.gold,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  previewError: {
    color: theme.colors.error,
  },
  meditationArea: {
    minHeight: 140,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
