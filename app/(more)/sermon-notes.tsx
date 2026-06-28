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
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { fetchSermonNotes } from '@/lib/api/sermon';
import type { SermonNote } from '@/types/sermon';

export default function SermonNotesScreen() {
  const [notes, setNotes] = useState<SermonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data } = await fetchSermonNotes();
    setNotes(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotes();
    }, [loadNotes]),
  );

  if (loading && notes.length === 0) {
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
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">Sermon notes</AppText>
            <AppText muted>
              Revisit what God spoke — verses fetched from Scripture, your meditation preserved.
            </AppText>
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
          <AppText muted style={styles.empty}>
            No sermon notes yet. Capture your next message from church or your quiet time.
          </AppText>
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
  },
  header: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  createButton: {
    marginTop: theme.spacing.sm,
  },
  empty: {
    textAlign: 'center',
    lineHeight: 24,
    marginTop: theme.spacing.xl,
  },
});
