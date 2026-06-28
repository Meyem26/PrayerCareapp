import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { getScheduleLabel } from '@/constants/schedule';
import { getStatusLabel } from '@/lib/timeline-labels';
import type { Prayer } from '@/types/prayer';

type PrayerCardProps = {
  prayer: Prayer;
  categoryLabel?: string | null;
  scheduleType?: string;
  onPress: () => void;
};

export function PrayerCard({ prayer, categoryLabel, scheduleType, onPress }: PrayerCardProps) {
  const status = getStatusLabel(prayer.status, prayer.is_hidden);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <AppText style={styles.title} numberOfLines={2}>
          {prayer.title}
        </AppText>
        <View style={[styles.badge, prayer.status === 'answered' && styles.badgeAnswered]}>
          <AppText
            variant="bodySmall"
            style={[
              styles.badgeText,
              prayer.status === 'answered' && styles.badgeTextAnswered,
            ]}>
            {status}
          </AppText>
        </View>
      </View>
      {prayer.prayer_point ? (
        <AppText muted numberOfLines={2} style={styles.point}>
          {prayer.prayer_point}
        </AppText>
      ) : null}
      <View style={styles.meta}>
        {categoryLabel ? <AppText variant="bodySmall" muted>{categoryLabel}</AppText> : null}
        {scheduleType ? (
          <AppText variant="bodySmall" muted>
            {getScheduleLabel(scheduleType as never)}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.92,
    borderColor: theme.colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  badge: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  badgeAnswered: {
    backgroundColor: theme.colors.goldLight,
  },
  badgeText: {
    color: theme.colors.accentDark,
    fontWeight: '500',
  },
  badgeTextAnswered: {
    color: theme.colors.gold,
  },
  point: {
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
});
