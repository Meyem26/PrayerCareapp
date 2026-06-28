import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { PrayerCard } from '@/components/prayer/PrayerCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { BETA_MODE } from '@/constants/beta';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTodayPrayers } from '@/lib/api/prayers';
import type { Prayer } from '@/types/prayer';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const { profile } = useAuth();
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrayers = useCallback(async () => {
    if (!profile?.id) return;

    const { data } = await fetchTodayPrayers(profile.id, profile.timezone);
    setPrayers(data);
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

  if (loading && prayers.length === 0) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={theme.colors.accent} />
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
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="greeting">
              {getGreeting()}, {firstName}.
            </AppText>
            <AppText muted style={styles.subtitle}>
              You have {count} prayer commitment{count === 1 ? '' : 's'} today.
            </AppText>
            {count === 0 ? (
              <AppText muted style={styles.hint}>
                When you add a prayer with a schedule, it will appear here on the right days.
              </AppText>
            ) : null}
            <Button
              title={count > 0 ? 'Add another prayer' : 'Start Prayer'}
              variant="primary"
              style={styles.startButton}
              onPress={() => router.push('/(tabs)/pray')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <PrayerCard
            prayer={item}
            onPress={() => router.push({ pathname: '/prayer/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: BETA_MODE ? 100 : theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
  },
  hint: {
    lineHeight: 24,
  },
  startButton: {
    marginTop: theme.spacing.sm,
  },
});
