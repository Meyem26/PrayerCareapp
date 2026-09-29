import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SettingRow } from '@/components/ui/SettingRow';
import {
  formatReminderTimeLabel,
  normalizeReminderTime,
  parseReminderTime,
  REMINDER_TIME_PRESETS,
} from '@/constants/reminders';
import { theme } from '@/constants/theme';
import type { ReminderTimeDraft } from '@/types/reminder';

type ReminderTimesPickerProps = {
  value: ReminderTimeDraft[];
  onChange: (next: ReminderTimeDraft[]) => void;
  label?: string;
  last?: boolean;
};

const PERIODS: { label: string; test: (hour: number) => boolean }[] = [
  { label: 'Morning', test: (hour) => hour < 12 },
  { label: 'Afternoon', test: (hour) => hour >= 12 && hour < 17 },
  { label: 'Evening', test: (hour) => hour >= 17 },
];

function newDraft(time: string): ReminderTimeDraft {
  return {
    key: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: normalizeReminderTime(time),
    enabled: true,
  };
}

function dateFromTime(time: string): Date {
  const { hour, minute } = parseReminderTime(time);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function timeFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function sortByTime(items: ReminderTimeDraft[]): ReminderTimeDraft[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

export function ReminderTimesPicker({
  value,
  onChange,
  label = 'Reminder',
  last,
}: ReminderTimesPickerProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [draftTime, setDraftTime] = useState('08:00');
  const [webTime, setWebTime] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const sorted = useMemo(() => sortByTime(value), [value]);
  const selectedTimes = useMemo(
    () => new Set(value.map((item) => normalizeReminderTime(item.time))),
    [value],
  );
  const customTimes = sorted.filter(
    (item) => !REMINDER_TIME_PRESETS.some((preset) => preset.value === normalizeReminderTime(item.time)),
  );

  function toggleTime(time: string) {
    const normalized = normalizeReminderTime(time);
    if (selectedTimes.has(normalized)) {
      onChange(value.filter((item) => normalizeReminderTime(item.time) !== normalized));
    } else {
      onChange(sortByTime([...value, newDraft(normalized)]));
    }
  }

  function addTime(time: string) {
    const normalized = normalizeReminderTime(time);
    if (!selectedTimes.has(normalized)) {
      onChange(sortByTime([...value, newDraft(normalized)]));
    }
  }

  function remove(key: string) {
    onChange(value.filter((item) => item.key !== key));
  }

  function toggleEnabled(key: string) {
    onChange(value.map((item) => (item.key === key ? { ...item, enabled: !item.enabled } : item)));
  }

  function openCustom() {
    setCustomError(null);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateFromTime('08:00'),
        mode: 'time',
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected) addTime(timeFromDate(selected));
        },
      });
      return;
    }
    setDraftTime('08:00');
    setWebTime('');
    setCustomMode(true);
  }

  function commitCustom() {
    if (Platform.OS === 'web') {
      const match = /^(\d{1,2}):(\d{2})$/.exec(webTime.trim());
      if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
        setCustomError('Use 24-hour time, e.g. 07:30 or 21:15.');
        return;
      }
      addTime(webTime.trim());
    } else {
      addTime(draftTime);
    }
    setCustomMode(false);
  }

  function closeSheet() {
    setCustomMode(false);
    setOpen(false);
  }

  const activeCount = value.filter((item) => item.enabled).length;
  const pausedCount = sorted.length - activeCount;

  return (
    <SettingRow
      label={label}
      value={
        sorted.length === 0
          ? null
          : `${sorted.length} reminder${sorted.length === 1 ? '' : 's'} a day`
      }
      placeholder="Add a reminder"
      description={
        sorted.length === 0
          ? 'Optional · a gentle nudge on your phone'
          : pausedCount > 0
            ? `${pausedCount} paused · tap a time to pause or resume`
            : 'Tap a time to pause it'
      }
      actionLabel="Edit"
      onPress={() => setOpen(true)}
      last={last}>
      {sorted.length > 0 ? (
        <View style={styles.chips}>
          {sorted.map((item) => (
            <View key={item.key} style={[styles.chip, !item.enabled && styles.chipPaused]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${formatReminderTimeLabel(item.time)}, ${item.enabled ? 'on' : 'paused'}. Tap to ${item.enabled ? 'pause' : 'resume'}`}
                onPress={() => toggleEnabled(item.key)}
                hitSlop={4}>
                <AppText
                  variant="bodySmall"
                  style={item.enabled ? styles.chipText : styles.chipTextPaused}>
                  {formatReminderTimeLabel(item.time)}
                  {item.enabled ? '' : ' · paused'}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${formatReminderTimeLabel(item.time)} reminder`}
                onPress={() => remove(item.key)}
                hitSlop={8}>
                <AppText style={styles.chipRemove}>×</AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <BottomSheet
        visible={open}
        onClose={closeSheet}
        title={customMode ? 'Custom time' : 'Remind me to pray'}
        subtitle={
          customMode
            ? 'Pick any time of day.'
            : 'Choose as many times as you like. Each one sends a notification, even when PrayerCare is closed.'
        }
        footer={
          customMode ? (
            <View style={styles.footerRow}>
              <Button
                title="Back"
                variant="secondary"
                onPress={() => setCustomMode(false)}
                style={styles.footerButton}
              />
              <Button title="Add time" onPress={commitCustom} style={styles.footerButton} />
            </View>
          ) : (
            <Button title={sorted.length > 0 ? 'Done' : 'Close'} onPress={closeSheet} />
          )
        }>
        {customMode ? (
          Platform.OS === 'web' ? (
            <Input
              label="Time (24-hour)"
              value={webTime}
              onChangeText={(text) => {
                setWebTime(text);
                setCustomError(null);
              }}
              placeholder="07:30"
              error={customError}
            />
          ) : (
            <DateTimePicker
              value={dateFromTime(draftTime)}
              mode="time"
              display="spinner"
              onChange={(_event, selected) => {
                if (selected) setDraftTime(timeFromDate(selected));
              }}
            />
          )
        ) : (
          <>
            {PERIODS.map((period) => {
              const presets = REMINDER_TIME_PRESETS.filter((preset) =>
                period.test(parseReminderTime(preset.value).hour),
              );
              if (presets.length === 0) return null;
              return (
                <View key={period.label} style={styles.group}>
                  <AppText variant="label" style={styles.groupLabel}>
                    {period.label}
                  </AppText>
                  {presets.map((preset) => (
                    <TimeRow
                      key={preset.value}
                      label={preset.label}
                      selected={selectedTimes.has(preset.value)}
                      onPress={() => toggleTime(preset.value)}
                    />
                  ))}
                </View>
              );
            })}

            {customTimes.length > 0 ? (
              <View style={styles.group}>
                <AppText variant="label" style={styles.groupLabel}>
                  Your custom times
                </AppText>
                {customTimes.map((item) => (
                  <TimeRow
                    key={item.key}
                    label={formatReminderTimeLabel(item.time)}
                    selected
                    onPress={() => remove(item.key)}
                  />
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={openCustom}
              style={({ pressed }) => [styles.customRow, pressed && styles.rowPressed]}>
              <AppText accent style={styles.customLabel}>
                ＋ Add a custom time
              </AppText>
            </Pressable>
          </>
        )}
      </BottomSheet>
    </SettingRow>
  );
}

function TimeRow({
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
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label} reminder`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}>
      <AppText style={selected ? styles.rowLabelSelected : undefined}>{label}</AppText>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <AppText style={styles.checkmark}>✓</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
  },
  chipPaused: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  chipText: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  chipTextPaused: {
    color: theme.colors.textMuted,
  },
  chipRemove: {
    fontSize: 18,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  group: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  groupLabel: {
    marginLeft: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowLabelSelected: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkmark: {
    color: theme.colors.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  customRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    alignItems: 'center',
  },
  customLabel: {
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
