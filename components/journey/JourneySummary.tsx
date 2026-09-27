import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type JourneySummaryProps = {
  daysThisMonth: number | null;
  carrying: number;
  answered: number;
  streak?: number | null;
};

function Stat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.stat}>
      <AppText style={[styles.value, gold && styles.valueGold]}>{value}</AppText>
      <AppText variant="bodySmall" muted style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

export function JourneySummary({ daysThisMonth, carrying, answered, streak }: JourneySummaryProps) {
  const days = daysThisMonth ?? 0;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${days} days of prayer this month. ${carrying} prayers you are carrying. ${answered} answered prayers.`}>
      <View style={styles.stats}>
        <Stat
          value={daysThisMonth === null ? '–' : String(days)}
          label={days === 1 ? 'day of prayer\nthis month' : 'days of prayer\nthis month'}
        />
        <View style={styles.divider} />
        <Stat value={String(carrying)} label={carrying === 1 ? 'prayer\ncarried' : 'prayers\ncarried'} />
        <View style={styles.divider} />
        <Stat value={String(answered)} label={answered === 1 ? 'prayer\nanswered' : 'prayers\nanswered'} gold />
      </View>
      {streak && streak > 1 ? (
        <AppText variant="bodySmall" style={styles.streak}>
          {streak} days in a row — keep walking with Him.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  valueGold: {
    color: theme.colors.gold,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 17,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  streak: {
    textAlign: 'center',
    color: theme.colors.accentDark,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
});
