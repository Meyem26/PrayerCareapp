import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
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
      setError('Add at least one reference, e.g. 1 Cor 11:1 or John 3:16.');
      return;
    }

    if (!profile) {
      setError('You must be signed in.');
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
        previews.push({ reference, error: fetchError ?? 'Could not fetch verse.' });
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
      setError('Please add a sermon title.');
      return;
    }

    if (!profile) {
      setError('You must be signed in.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <AppText variant="greeting">Capture the Word</AppText>
            <AppText muted>
              Add references and your notes — verses are fetched automatically (free public-domain
              translations).
            </AppText>
          </View>

          <Input label="Sermon title" value={title} onChangeText={setTitle} placeholder="What was preached?" />
          <Input label="Speaker" value={speaker} onChangeText={setSpeaker} placeholder="Optional" />
          <Input label="Church" value={church} onChangeText={setChurch} placeholder="Optional" />

          <TextArea
            label="Bible references"
            value={referencesRaw}
            onChangeText={(value) => {
              setReferencesRaw(value);
              setVersePreviews([]);
            }}
            placeholder={'One per line, e.g.\n1 Cor 11:1\nJohn 3:16'}
            style={styles.referencesArea}
          />

          <Button
            title="Fetch verses"
            variant="secondary"
            loading={fetchingVerses}
            onPress={handleFetchVerses}
          />

          {versePreviews.length > 0 ? (
            <View style={styles.previewBlock}>
              <AppText variant="title">Preview</AppText>
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
            label="Personal meditation"
            value={meditation}
            onChangeText={setMeditation}
            placeholder="What is God speaking to you through this message?"
            style={styles.meditationArea}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <Button title="Save sermon note" loading={loading} onPress={handleSave} />
        </ScrollView>
      </KeyboardAvoidingView>
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
