import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t } = useI18n();
  const days = daysThisMonth ?? 0;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${days} ${days === 1 ? t('journey.dayOfPrayer') : t('journey.daysOfPrayer')}. ${carrying} ${carrying === 1 ? t('journey.prayerCarried') : t('journey.prayersCarried')}. ${answered} ${answered === 1 ? t('journey.prayerAnswered') : t('journey.prayersAnswered')}.`}>
      <View style={styles.stats}>
        <Stat
          value={daysThisMonth === null ? '–' : String(days)}
          label={days === 1 ? t('journey.dayOfPrayer') : t('journey.daysOfPrayer')}
        />
        <View style={styles.divider} />
        <Stat
          value={String(carrying)}
          label={carrying === 1 ? t('journey.prayerCarried') : t('journey.prayersCarried')}
        />
        <View style={styles.divider} />
        <Stat
          value={String(answered)}
          label={answered === 1 ? t('journey.prayerAnswered') : t('journey.prayersAnswered')}
          gold
        />
      </View>
      {streak && streak > 1 ? (
        <AppText variant="bodySmall" style={styles.streak}>
          {t('journey.streak', { count: streak })}
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
