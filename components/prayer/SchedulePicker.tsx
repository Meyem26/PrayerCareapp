import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { SettingRow } from '@/components/ui/SettingRow';
import {
  describeRepeat,
  getWeekdayLabel,
  REPEAT_CHOICES,
  WEEKDAY_KEYS,
} from '@/constants/schedule';
import { theme } from '@/constants/theme';
import { useI18n } from '@/contexts/I18nContext';
import type { ScheduleType } from '@/types/prayer';

type SchedulePickerProps = {
  value: ScheduleType;
  weekdays: number[];
  onChangeSchedule: (type: ScheduleType) => void;
  onChangeWeekdays: (days: number[]) => void;
  last?: boolean;
};

export function SchedulePicker({
  value,
  weekdays,
  onChangeSchedule,
  onChangeWeekdays,
  last,
}: SchedulePickerProps) {
  const { t } = useI18n();
  const needsDays = value === 'specific_weekdays' && weekdays.length === 0;
  const [expanded, setExpanded] = useState(needsDays);
  const lastRepeat = useRef<Exclude<ScheduleType, 'once'>>(value === 'once' ? 'daily' : value);
  const repeats = value !== 'once';

  useEffect(() => {
    if (value !== 'once') lastRepeat.current = value;
  }, [value]);

  useEffect(() => {
    if (needsDays) setExpanded(true);
  }, [needsDays]);

  function toggleWeekday(day: number) {
    onChangeWeekdays(
      weekdays.includes(day) ? weekdays.filter((d) => d !== day) : [...weekdays, day].sort(),
    );
  }

  const selectedChoice = REPEAT_CHOICES.find((choice) => choice.type === value);

  return (
    <SettingRow
      label={t('schedule.repeat')}
      value={describeRepeat(value, weekdays)}
      placeholder={t('schedule.chooseWhen')}
      actionLabel={expanded ? t('common.done') : t('schedule.change')}
      onPress={() => {
        if (expanded && needsDays) return;
        setExpanded((open) => !open);
      }}
      last={last}>
      {expanded ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.panel}>
          <AppText style={styles.question}>{t('schedule.needsRepeat')}</AppText>
          <View style={styles.pills}>
            <Pill
              label={t('schedule.noJustToday')}
              selected={!repeats}
              onPress={() => onChangeSchedule('once')}
            />
            <Pill
              label={t('schedule.yesRepeat')}
              selected={repeats}
              onPress={() => {
                if (!repeats) onChangeSchedule(lastRepeat.current);
              }}
            />
          </View>

          {repeats ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.section}>
              <AppText variant="label" style={styles.sectionLabel}>
                {t('schedule.howOften')}
              </AppText>
              <View style={styles.pills}>
                {REPEAT_CHOICES.map((choice) => (
                  <Pill
                    key={choice.type}
                    label={t(choice.labelKey)}
                    selected={value === choice.type}
                    onPress={() => onChangeSchedule(choice.type)}
                  />
                ))}
              </View>
              {selectedChoice ? (
                <AppText variant="bodySmall" muted>
                  {t(selectedChoice.hintKey)}
                </AppText>
              ) : null}

              {value === 'specific_weekdays' ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.section}>
                  <AppText variant="label" style={styles.sectionLabel}>
                    {t('schedule.whichDays')}
                  </AppText>
                  <View style={styles.weekdays}>
                    {WEEKDAY_KEYS.map((dayKey, index) => {
                      const dayLabel = getWeekdayLabel(index);
                      const selected = weekdays.includes(index);
                      return (
                        <Pressable
                          key={dayKey}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          accessibilityLabel={dayLabel}
                          onPress={() => toggleWeekday(index)}
                          style={[styles.dayChip, selected && styles.dayChipSelected]}>
                          <AppText
                            variant="bodySmall"
                            style={selected ? styles.dayTextSelected : styles.dayText}>
                            {dayLabel.slice(0, 1)}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {needsDays ? (
                    <AppText variant="bodySmall" style={styles.hint}>
                      {t('schedule.pickOneDay')}
                    </AppText>
                  ) : null}
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : (
            <AppText variant="bodySmall" muted>
              {t('schedule.todayOnlyHint')}
            </AppText>
          )}
        </Animated.View>
      ) : null}
    </SettingRow>
  );
}

function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, selected && styles.pillSelected, pressed && styles.pillPressed]}>
      <AppText variant="bodySmall" style={selected ? styles.pillTextSelected : styles.pillText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  question: {
    fontWeight: '500',
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillSelected: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  dayChip: {
    flex: 1,
    maxWidth: 44,
    aspectRatio: 1,
    borderRadius: 22,
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
  dayText: {
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dayTextSelected: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  hint: {
    color: theme.colors.gold,
  },
});
