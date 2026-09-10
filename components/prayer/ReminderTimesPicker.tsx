import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
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
};

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

function sortByTime(items: ReminderTimeDraft[]): ReminderTimeDraft[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

export function ReminderTimesPicker({ value, onChange }: ReminderTimesPickerProps) {
  const [pickingCustom, setPickingCustom] = useState(false);
  const [draftTime, setDraftTime] = useState('08:00');
  const [androidOpen, setAndroidOpen] = useState(false);

  const selectedTimes = useMemo(
    () => new Set(value.map((item) => normalizeReminderTime(item.time))),
    [value],
  );

  function isSelected(time: string): boolean {
    return selectedTimes.has(normalizeReminderTime(time));
  }

  function togglePreset(time: string) {
    const normalized = normalizeReminderTime(time);
    if (isSelected(normalized)) {
      onChange(value.filter((item) => normalizeReminderTime(item.time) !== normalized));
      return;
    }
    onChange(sortByTime([...value, newDraft(normalized)]));
  }

  function remove(key: string) {
    onChange(value.filter((item) => item.key !== key));
  }

  function toggleEnabled(key: string, enabled: boolean) {
    onChange(value.map((item) => (item.key === key ? { ...item, enabled } : item)));
  }

  function openCustom() {
    setDraftTime('08:00');
    setPickingCustom(true);
    if (Platform.OS === 'android') setAndroidOpen(true);
  }

  function commitCustom(time: string) {
    const normalized = normalizeReminderTime(time);
    if (isSelected(normalized)) {
      setPickingCustom(false);
      setAndroidOpen(false);
      return;
    }
    onChange(sortByTime([...value, newDraft(normalized)]));
    setPickingCustom(false);
    setAndroidOpen(false);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setAndroidOpen(false);
      if (event.type === 'dismissed') {
        setPickingCustom(false);
        return;
      }
    }
    if (!selected) return;
    const next = `${String(selected.getHours()).padStart(2, '0')}:${String(
      selected.getMinutes(),
    ).padStart(2, '0')}`;
    setDraftTime(next);
    if (Platform.OS === 'android') {
      commitCustom(next);
    }
  }

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">Prayer reminders</AppText>
      <AppText variant="bodySmall" muted>
        Choose as many times as you like for this prayer. Each selected time sends a phone
        notification — even when PrayerCare is closed.
      </AppText>

      <View style={styles.presets}>
        {REMINDER_TIME_PRESETS.map((preset) => {
          const selected = isSelected(preset.value);
          return (
            <Pressable
              key={preset.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${preset.label} reminder`}
              onPress={() => togglePreset(preset.value)}
              style={[styles.presetChip, selected && styles.presetChipSelected]}>
              <AppText
                variant="bodySmall"
                style={selected ? styles.presetTextSelected : undefined}>
                {preset.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {value.length > 0 ? (
        <View style={styles.list}>
          <AppText variant="bodySmall" muted>
            {value.filter((item) => item.enabled).length} active reminder
            {value.filter((item) => item.enabled).length === 1 ? '' : 's'}
          </AppText>
          {sortByTime(value).map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={styles.timePress}>
                <AppText style={styles.timeLabel}>{formatReminderTimeLabel(item.time)}</AppText>
                <AppText variant="bodySmall" muted>
                  {item.enabled ? 'Will notify' : 'Paused'}
                </AppText>
              </View>
              <Switch
                value={item.enabled}
                onValueChange={(enabled) => toggleEnabled(item.key, enabled)}
                trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
                thumbColor={item.enabled ? theme.colors.accent : theme.colors.surface}
                accessibilityLabel="Enable this reminder"
              />
              <Pressable
                onPress={() => remove(item.key)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove reminder">
                <AppText style={styles.remove}>Remove</AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="bodySmall" muted style={styles.empty}>
          No times selected yet. Tap morning, midday, evening — or add a custom time.
        </AppText>
      )}

      <Button title="+ Custom time" variant="secondary" onPress={openCustom} />

      {Platform.OS === 'android' && androidOpen ? (
        <DateTimePicker
          value={dateFromTime(draftTime)}
          mode="time"
          display="default"
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' && pickingCustom ? (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => setPickingCustom(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <AppText variant="title">Custom reminder time</AppText>
              <DateTimePicker
                value={dateFromTime(draftTime)}
                mode="time"
                display="spinner"
                onChange={onPickerChange}
              />
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="ghost" onPress={() => setPickingCustom(false)} />
                <Button title="Add time" onPress={() => commitCustom(draftTime)} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'web' && pickingCustom ? (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setPickingCustom(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <AppText variant="title">Custom reminder time</AppText>
              <View style={styles.presets}>
                {REMINDER_TIME_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.value}
                    style={[
                      styles.presetChip,
                      draftTime === preset.value && styles.presetChipSelected,
                    ]}
                    onPress={() => setDraftTime(preset.value)}>
                    <AppText
                      variant="bodySmall"
                      style={
                        draftTime === preset.value ? styles.presetTextSelected : undefined
                      }>
                      {preset.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="ghost" onPress={() => setPickingCustom(false)} />
                <Button title="Add time" onPress={() => commitCustom(draftTime)} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  empty: {
    marginTop: theme.spacing.xs,
  },
  list: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timePress: {
    flex: 1,
    gap: 2,
  },
  timeLabel: {
    fontWeight: '600',
    fontSize: 17,
  },
  remove: {
    color: theme.colors.error,
    fontWeight: '500',
    fontSize: 14,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  presetChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  presetChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  presetTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(42,42,42,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalActions: {
    gap: theme.spacing.sm,
  },
});
