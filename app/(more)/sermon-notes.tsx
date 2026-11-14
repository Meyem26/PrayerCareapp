import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { SermonNoteCard } from '@/components/sermon/SermonNoteCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useI18n } from '@/contexts/I18nContext';
import { fetchSermonNotes } from '@/lib/api/sermon';
import type { SermonNote } from '@/types/sermon';

export default function SermonNotesScreen() {
  const { t } = useI18n();
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const { data, error: fetchError } = await fetchSermonNotes();
    setNotes(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotes();
    }, [loadNotes]),
  );

  if (loading && notes.length === 0 && !error) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotes();
            }}
            tintColor={theme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">{t('sermon.listTitle')}</AppText>
            <AppText muted>{t('sermon.listSubtitle')}</AppText>
            {error ? <AppText style={styles.error}>{t('sermon.loadError')}</AppText> : null}
            <Button
              title={t('sermon.newNote')}
              onPress={() => router.push('/sermon/create')}
              style={styles.createButton}
            />
          </View>
        }
        renderItem={({ item }) => (
          <SermonNoteCard
            note={item}
            onPress={() => router.push({ pathname: '/sermon/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              title={t('sermon.emptyTitle')}
              body={t('sermon.emptyBody')}
              actionLabel={t('sermon.newNote')}
              onAction={() => router.push('/sermon/create')}
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  header: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  createButton: {
    marginTop: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
    lineHeight: 24,
  },
});
