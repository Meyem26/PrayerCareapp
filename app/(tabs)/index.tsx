import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';

import { PrayerCard } from '@/components/prayer/PrayerCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { PrayerListSkeleton } from '@/components/ui/Skeleton';
import { BETA_MODE } from '@/constants/beta';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { fetchTodayPrayers } from '@/lib/api/prayers';
import type { Prayer } from '@/types/prayer';

const TODAY_VERSE = {
  text: 'Pray without ceasing.',
  reference: '1 Thessalonians 5:17',
} as const;

export default function TodayScreen() {
  const { profile } = useAuth();
  const { t } = useI18n();
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

  const firstName = profile?.display_name?.split(' ')[0];
  const count = prayers.length;

  function prayerCountLabel(n: number): string {
    if (n === 0) return t('today.quietDay');
    if (n === 1) return t('today.onePrayer');
    return t('today.manyPrayers', { count: n });
  }

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
            <AppText variant="greeting">
              {firstName ? t('today.welcomeBack', { name: firstName }) : t('today.welcomeFriend')}
            </AppText>
            <View style={styles.verseBlock}>
              <AppText style={styles.verseText}>"{TODAY_VERSE.text}"</AppText>
              <AppText muted style={styles.verseRef}>
                — {TODAY_VERSE.reference} · WEB (public domain)
              </AppText>
            </View>
            {error ? (
              <AppText style={styles.error}>{t('today.loadError')}</AppText>
            ) : (
              <AppText muted style={styles.subtitle}>
                {prayerCountLabel(count)}
              </AppText>
            )}
            {count > 0 ? (
              <Button
                title={t('today.addAnother')}
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
              title={t('today.emptyTitle')}
              body={t('today.emptyBody')}
              actionLabel={t('today.startPrayer')}
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
    padding: Platform.OS === 'web' ? theme.spacing.md : theme.spacing.lg,
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
    fontSize: Platform.OS === 'web' ? 17 : 18,
    lineHeight: Platform.OS === 'web' ? 26 : 28,
    fontStyle: 'italic',
    color: theme.colors.text,
  },
  verseRef: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
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
