import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { addDays, formatWeekdayDate, getTodayDateString } from '@/lib/utils/date';

type DateNavigatorProps = {
  date: string;
  timezone: string;
  onChange: (date: string) => void;
};

export function DateNavigator({ date, timezone, onChange }: DateNavigatorProps) {
  const today = getTodayDateString(timezone);
  const isToday = date === today;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          onPress={() => onChange(addDays(date, -1))}>
          <AppText style={styles.arrowText}>‹</AppText>
        </Pressable>

        <View style={styles.center}>
          <AppText style={styles.dateLabel}>{formatWeekdayDate(date)}</AppText>
          {!isToday ? (
            <Pressable onPress={() => onChange(today)}>
              <AppText variant="bodySmall" accent>
                Jump to today
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="bodySmall" muted>
              Today
            </AppText>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          onPress={() => onChange(addDays(date, 1))}>
          <AppText style={styles.arrowText}>›</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  arrowText: {
    fontSize: 28,
    lineHeight: 28,
    color: theme.colors.textSecondary,
    marginTop: -4,
  },
  pressed: {
    backgroundColor: theme.colors.accentLight,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dateLabel: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
});
