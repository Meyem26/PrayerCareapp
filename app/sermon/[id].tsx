import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OverflowMenu, type OverflowMenuItem } from '@/components/ui/OverflowMenu';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteSermonNote,
  fetchSermonNote,
  refreshSermonReferenceScripture,
  updateSermonNote,
} from '@/lib/api/sermon';
import { formatDisplayDate } from '@/lib/utils/date';
import type { SermonNoteWithReferences } from '@/types/sermon';

export default function SermonNoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [note, setNote] = useState<SermonNoteWithReferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [church, setChurch] = useState('');
  const [meditation, setMeditation] = useState('');
  const [refreshingRefId, setRefreshingRefId] = useState<string | null>(null);

  const loadNote = useCallback(async () => {
    if (!id) return;

    const { data, error: fetchError } = await fetchSermonNote(id);
    setNote(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);

    if (data) {
      setTitle(data.title);
      setSpeaker(data.speaker ?? '');
      setChurch(data.church ?? '');
      setMeditation(data.meditation_notes ?? '');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNote();
    }, [loadNote]),
  );

  function confirmDelete() {
    Alert.alert('Delete sermon note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const result = await deleteSermonNote(id);
          if (result.error) {
            Alert.alert('Error', result.error);
            return;
          }
          router.replace('/(more)/sermon-notes');
        },
      },
    ]);
  }

  async function handleSave() {
    if (!id || !profile) return;

    setSaving(true);
    const result = await updateSermonNote(id, {
      title,
      speaker,
      church,
      meditation_notes: meditation,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setEditing(false);
    await loadNote();
  }

  async function handleRefreshVerse(referenceId: string, reference: string) {
    if (!profile) return;

    setRefreshingRefId(referenceId);
    const result = await refreshSermonReferenceScripture(
      referenceId,
      reference,
      profile.bible_translation_id,
    );
    setRefreshingRefId(null);

    if (result.error) {
      Alert.alert('Could not fetch verse', result.error);
      return;
    }

    await loadNote();
  }

  const menuItems: OverflowMenuItem[] = [
    {
      label: editing ? 'Cancel edit' : 'Edit details',
      onPress: () => {
        setEditing((prev) => !prev);
        setError(null);
      },
    },
    { label: 'Delete', destructive: true, onPress: confirmDelete },
  ];

  if (loading && !note) {
    return (
      <Screen centered>
        <AppText muted>Loading...</AppText>
      </Screen>
    );
  }

  if (!note) {
    return (
      <Screen centered>
        <AppText muted>{error ?? 'Sermon note not found.'}</AppText>
        <Button title="Go back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNote(); }} />
        }>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              {editing ? (
                <Input label="Title" value={title} onChangeText={setTitle} />
              ) : (
                <AppText variant="greeting">{note.title}</AppText>
              )}
            </View>
            <OverflowMenu items={menuItems} accessibilityLabel="Sermon note options" />
          </View>

          {!editing ? (
            <AppText variant="bodySmall" muted>
              {formatDisplayDate(note.sermon_date)}
              {note.speaker ? ` · ${note.speaker}` : ''}
              {note.church ? ` · ${note.church}` : ''}
            </AppText>
          ) : (
            <View style={styles.editFields}>
              <Input label="Speaker" value={speaker} onChangeText={setSpeaker} />
              <Input label="Church" value={church} onChangeText={setChurch} />
            </View>
          )}
        </View>

        <View style={styles.block}>
          <AppText variant="title">Scripture</AppText>
          {note.sermon_references.length === 0 ? (
            <AppText muted>No references added.</AppText>
          ) : (
            note.sermon_references.map((ref) => {
              const snapshots = ref.scripture_snapshots;
              const snapshot = Array.isArray(snapshots) ? snapshots[0] : snapshots ?? undefined;
              const hasVerseText = Boolean(snapshot?.text && snapshot.source === 'api');
              return (
                <View key={ref.id} style={styles.referenceBlock}>
                  <AppText style={styles.referenceLabel}>{ref.reference}</AppText>
                  <AppText style={styles.verseText}>
                    {snapshot?.text ?? 'Verse text not loaded yet.'}
                  </AppText>
                  {snapshot?.source === 'api' ? (
                    <AppText variant="bodySmall" muted>
                      {snapshot.translation_id} · Scripture API
                    </AppText>
                  ) : snapshot?.source === 'manual' && snapshot.text.includes('Could not') ? (
                    <AppText variant="bodySmall" style={styles.fetchHint}>
                      Tap Fetch verse below. If it still fails, deploy the fetch-scripture Edge Function.
                    </AppText>
                  ) : null}
                  <Button
                    title={hasVerseText ? 'Refresh verse' : 'Fetch verse'}
                    variant="ghost"
                    loading={refreshingRefId === ref.id}
                    onPress={() => handleRefreshVerse(ref.id, ref.reference)}
                  />
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.block, styles.meditationBlock]}>
          <AppText variant="title">Meditation</AppText>
          {editing ? (
            <TextArea
              value={meditation}
              onChangeText={setMeditation}
              placeholder="Your personal notes..."
              style={styles.meditationArea}
            />
          ) : (
            <AppText style={styles.body}>
              {note.meditation_notes ?? 'No meditation notes yet.'}
            </AppText>
          )}
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        {editing ? (
          <Button title="Save changes" loading={saving} onPress={handleSave} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  editFields: {
    gap: theme.spacing.sm,
  },
  block: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  meditationBlock: {
    backgroundColor: theme.colors.goldLight,
    borderColor: theme.colors.gold,
  },
  referenceBlock: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  referenceLabel: {
    fontWeight: '600',
    color: theme.colors.gold,
  },
  verseText: {
    fontSize: 17,
    lineHeight: 26,
  },
  fetchHint: {
    color: theme.colors.error,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
  },
  meditationArea: {
    minHeight: 120,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
