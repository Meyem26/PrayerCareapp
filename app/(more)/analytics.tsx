import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPrayerAnalytics } from '@/lib/api/history';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <AppText variant="greeting" accent style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="bodySmall" muted>
        {label}
      </AppText>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    active: '—',
    answered: '—',
    carePending: '—',
    careCompleted: '—',
    streak: '—',
  });

  const loadAnalytics = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data, error: fetchError } = await fetchPrayerAnalytics(profile.id);
    setLoading(false);

    if (fetchError || !data) {
      setError(fetchError ?? 'Could not load analytics.');
      return;
    }

    setError(null);
    setStats({
      active: String(data.active_prayers),
      answered: String(data.answered_prayers),
      carePending: String(data.care_actions_pending),
      careCompleted: String(data.care_actions_completed),
      streak: String(data.prayer_streak),
    });
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [loadAnalytics]),
  );

  if (loading) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText muted style={styles.lead}>
          A gentle overview of your prayer life — numbers that celebrate faithfulness, not
          pressure.
        </AppText>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <View style={styles.grid}>
          <StatCard label="Active prayers" value={stats.active} />
          <StatCard label="Answered prayers" value={stats.answered} />
          <StatCard label="Care in progress" value={stats.carePending} />
          <StatCard label="Care completed" value={stats.careCompleted} />
        </View>

        <View style={styles.streakCard}>
          <AppText variant="greeting" accent style={styles.streakValue}>
            {stats.streak}
          </AppText>
          <AppText style={styles.streakLabel}>Day prayer streak</AppText>
          <AppText variant="bodySmall" muted style={styles.streakHint}>
            Consecutive days you logged “I prayed today.” Missing today does not break yesterday’s
            streak until the day ends.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
  },
  lead: {
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: 32,
    lineHeight: 40,
  },
  streakCard: {
    backgroundColor: theme.colors.goldLight,
    borderWidth: 1,
    borderColor: theme.colors.gold,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 48,
    lineHeight: 56,
  },
  streakLabel: {
    fontWeight: '600',
    fontSize: 18,
  },
  streakHint: {
    textAlign: 'center',
    lineHeight: 22,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
