import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { SelectField } from '@/components/ui/SelectField';
import { SCHEDULE_OPTIONS, WEEKDAY_LABELS } from '@/constants/schedule';
import { theme } from '@/constants/theme';
import type { ScheduleType } from '@/types/prayer';

type SchedulePickerProps = {
  value: ScheduleType;
  weekdays: number[];
  onChangeSchedule: (type: ScheduleType) => void;
  onChangeWeekdays: (days: number[]) => void;
  label?: string;
};

export function SchedulePicker({
  value,
  weekdays,
  onChangeSchedule,
  onChangeWeekdays,
  label = 'How often?',
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
      <SelectField
        label={label}
        placeholder="Choose how often"
        sheetTitle="How often would you like to pray?"
        options={SCHEDULE_OPTIONS.map((option) => ({
          value: option.type,
          label: option.label,
          description: option.description,
        }))}
        value={value}
        onChange={onChangeSchedule}
      />

      {value === 'specific_weekdays' ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.daysBlock}>
          <AppText variant="bodySmall" muted>
            Which days?
          </AppText>
          <View style={styles.weekdays}>
            {WEEKDAY_LABELS.map((dayLabel, index) => {
              const selected = weekdays.includes(index);
              return (
                <Pressable
                  key={dayLabel}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={dayLabel}
                  onPress={() => toggleWeekday(index)}
                  style={[styles.dayChip, selected && styles.dayChipSelected]}>
                  <AppText
                    variant="bodySmall"
                    style={selected ? styles.dayChipTextSelected : styles.dayChipText}>
                    {dayLabel.slice(0, 1)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.md,
  },
  daysBlock: {
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dayChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dayChipText: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dayChipTextSelected: {
    color: theme.colors.white,
    fontWeight: '700',
  },
});
