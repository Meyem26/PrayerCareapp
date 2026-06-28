import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import {
  addMonths,
  formatMonthYear,
  getDaysInMonth,
  getTodayDateString,
  getWeekdayOfFirstDay,
  isSameDate,
  toDateString,
} from '@/lib/utils/date';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type MonthCalendarProps = {
  year: number;
  month: number;
  selectedDate: string;
  activityDates: string[];
  timezone: string;
  onMonthChange: (year: number, month: number) => void;
  onSelectDate: (date: string) => void;
};

export function MonthCalendar({
  year,
  month,
  selectedDate,
  activityDates,
  timezone,
  onMonthChange,
  onSelectDate,
}: MonthCalendarProps) {
  const today = getTodayDateString(timezone);
  const daysInMonth = getDaysInMonth(year, month);
  const startOffset = getWeekdayOfFirstDay(year, month);
  const activitySet = new Set(activityDates);

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          onPress={() => {
            const prev = addMonths(year, month, -1);
            onMonthChange(prev.year, prev.month);
          }}>
          <AppText style={styles.navText}>‹</AppText>
        </Pressable>
        <AppText style={styles.monthLabel}>{formatMonthYear(year, month)}</AppText>
        <Pressable
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          onPress={() => {
            const next = addMonths(year, month, 1);
            onMonthChange(next.year, next.month);
          }}>
          <AppText style={styles.navText}>›</AppText>
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_LABELS.map((label, index) => (
          <AppText key={`${label}-${index}`} variant="bodySmall" muted style={styles.weekday}>
            {label}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }

          const dateStr = toDateString(year, month, day);
          const selected = isSameDate(dateStr, selectedDate);
          const isToday = isSameDate(dateStr, today);
          const hasActivity = activitySet.has(dateStr);

          return (
            <Pressable
              key={dateStr}
              style={({ pressed }) => [
                styles.cell,
                selected && styles.cellSelected,
                isToday && !selected && styles.cellToday,
                pressed && styles.pressed,
              ]}
              onPress={() => onSelectDate(dateStr)}>
              <AppText
                variant="bodySmall"
                style={[
                  styles.dayText,
                  selected && styles.dayTextSelected,
                  isToday && !selected && styles.dayTextToday,
                ]}>
                {day}
              </AppText>
              {hasActivity ? <View style={[styles.dot, selected && styles.dotSelected]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  navText: {
    fontSize: 24,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  pressed: {
    backgroundColor: theme.colors.accentLight,
  },
  monthLabel: {
    fontWeight: '600',
    fontSize: 17,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    gap: 2,
  },
  cellSelected: {
    backgroundColor: theme.colors.accent,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  dayText: {
    fontWeight: '500',
  },
  dayTextSelected: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  dayTextToday: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.gold,
  },
  dotSelected: {
    backgroundColor: theme.colors.white,
  },
});
