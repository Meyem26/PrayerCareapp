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
import { fetchSermonNotes } from '@/lib/api/sermon';
import type { SermonNote } from '@/types/sermon';

export default function SermonNotesScreen() {
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
            <AppText variant="greeting">Sermon notes</AppText>
            <AppText muted>
              Revisit what God spoke — verses fetched from Scripture, your meditation preserved.
            </AppText>
            {error ? (
              <AppText style={styles.error}>
                We couldn't load sermon notes. Pull to refresh, or try again in a moment.
              </AppText>
            ) : null}
            <Button
              title="New sermon note"
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
              title="No sermon notes yet"
              body="Capture a message from church or quiet time. Lookup verses from a public-domain translation and keep your meditation with them."
              actionLabel="New sermon note"
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
