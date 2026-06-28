import { Pressable, StyleSheet, View } from 'react-native';

import { OptionCard } from '@/components/ui/OptionCard';
import { AppText } from '@/components/ui/AppText';
import { SCHEDULE_OPTIONS, WEEKDAY_LABELS } from '@/constants/schedule';
import { theme } from '@/constants/theme';
import type { ScheduleType } from '@/types/prayer';

type SchedulePickerProps = {
  value: ScheduleType;
  weekdays: number[];
  onChangeSchedule: (type: ScheduleType) => void;
  onChangeWeekdays: (days: number[]) => void;
};

export function SchedulePicker({
  value,
  weekdays,
  onChangeSchedule,
  onChangeWeekdays,
}: SchedulePickerProps) {
  function toggleWeekday(day: number) {
    if (weekdays.includes(day)) {
      onChangeWeekdays(weekdays.filter((d) => d !== day));
    } else {
      onChangeWeekdays([...weekdays, day].sort());
    }
  }

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">How often?</AppText>
      {SCHEDULE_OPTIONS.map((option) => (
        <OptionCard
          key={option.type}
          label={option.label}
          description={option.description}
          selected={value === option.type}
          onPress={() => onChangeSchedule(option.type)}
        />
      ))}

      {value === 'specific_weekdays' ? (
        <View style={styles.weekdays}>
          {WEEKDAY_LABELS.map((label, index) => (
            <Pressable
              key={label}
              onPress={() => toggleWeekday(index)}
              style={[styles.dayChip, weekdays.includes(index) && styles.dayChipSelected]}>
              <AppText
                variant="bodySmall"
                style={weekdays.includes(index) ? styles.dayChipTextSelected : undefined}>
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  weekdays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  dayChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dayChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dayChipTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
});
