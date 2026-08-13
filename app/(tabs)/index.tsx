import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { PrayerCard } from '@/components/prayer/PrayerCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { PrayerListSkeleton } from '@/components/ui/Skeleton';
import { BETA_MODE } from '@/constants/beta';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTodayPrayers } from '@/lib/api/prayers';
import type { Prayer } from '@/types/prayer';

const TODAY_VERSE = {
  text: 'Pray without ceasing.',
  reference: '1 Thessalonians 5:17',
} as const;

function prayerCountLabel(count: number): string {
  if (count === 0) {
    return 'A quiet day — rest, or begin with one prayer.';
  }
  if (count === 1) {
    return 'You have 1 prayer to lift up today.';
  }
  return `You have ${count} prayers to lift up today.`;
}

export default function TodayScreen() {
  const { profile } = useAuth();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrayers = useCallback(async () => {
    if (!profile?.id) return;

    const { data, error: fetchError } = await fetchTodayPrayers(profile.id, profile.timezone);
    setPrayers(data);
    setError(fetchError);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id, profile?.timezone]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPrayers();
    }, [loadPrayers]),
  );

  const firstName = profile?.display_name?.split(' ')[0] ?? 'Friend';
  const count = prayers.length;

  if (loading && prayers.length === 0 && !error) {
    return (
      <Screen padded={false}>
        <PrayerListSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={prayers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPrayers();
            }}
            tintColor={theme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">Welcome back, {firstName}.</AppText>
            <View style={styles.verseBlock}>
              <AppText style={styles.verseText}>"{TODAY_VERSE.text}"</AppText>
              <AppText muted style={styles.verseRef}>
                — {TODAY_VERSE.reference} · WEB (public domain)
              </AppText>
            </View>
            {error ? (
              <AppText style={styles.error}>
                We couldn't load today's prayers. Pull to refresh, or try again in a moment.
              </AppText>
            ) : (
              <AppText muted style={styles.subtitle}>
                {prayerCountLabel(count)}
              </AppText>
            )}
            {count > 0 ? (
              <Button
                title="Add another prayer"
                variant="primary"
                style={styles.startButton}
                onPress={() => router.push('/(tabs)/pray')}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PrayerCard
            prayer={item}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              title="No prayers scheduled today"
              body="When life is full, PrayerCare remembers for you. Add a prayer with a schedule and it will appear here on the right days."
              actionLabel="Start a prayer"
              onAction={() => router.push('/(tabs)/pray')}
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
    paddingBottom: BETA_MODE ? 100 : theme.spacing.xxl,
    flexGrow: 1,
  },
  header: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  verseBlock: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
    backgroundColor: theme.colors.goldLight,
    borderRadius: theme.radius.sm,
  },
  verseText: {
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
    color: theme.colors.text,
  },
  verseRef: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
  },
  error: {
    color: theme.colors.error,
    lineHeight: 24,
  },
  startButton: {
    marginTop: theme.spacing.sm,
  },
});
