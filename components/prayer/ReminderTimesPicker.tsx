import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
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

export function ReminderTimesPicker({ value, onChange }: ReminderTimesPickerProps) {
  const [picking, setPicking] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState('08:00');
  const [androidOpen, setAndroidOpen] = useState(false);

  function openAdd() {
    setEditingKey(null);
    setDraftTime('08:00');
    setPicking(true);
    if (Platform.OS === 'android') setAndroidOpen(true);
  }

  function openEdit(item: ReminderTimeDraft) {
    setEditingKey(item.key);
    setDraftTime(item.time);
    setPicking(true);
    if (Platform.OS === 'android') setAndroidOpen(true);
  }

  function remove(key: string) {
    onChange(value.filter((item) => item.key !== key));
  }

  function toggleEnabled(key: string, enabled: boolean) {
    onChange(value.map((item) => (item.key === key ? { ...item, enabled } : item)));
  }

  function commitTime(time: string) {
    const normalized = normalizeReminderTime(time);
    if (value.some((item) => item.time === normalized && item.key !== editingKey)) {
      // Duplicate — ignore silently by keeping picker open; user can pick another
      return false;
    }

    if (editingKey) {
      onChange(
        value.map((item) => (item.key === editingKey ? { ...item, time: normalized } : item)),
      );
    } else {
      onChange([...value, newDraft(normalized)]);
    }
    setPicking(false);
    setEditingKey(null);
    setAndroidOpen(false);
    return true;
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      setAndroidOpen(false);
      if (event.type === 'dismissed') {
        setPicking(false);
        return;
      }
    }
    if (!selected) return;
    const next = `${String(selected.getHours()).padStart(2, '0')}:${String(
      selected.getMinutes(),
    ).padStart(2, '0')}`;
    setDraftTime(next);
    if (Platform.OS === 'android') {
      commitTime(next);
    }
  }

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">Prayer reminders</AppText>
      <AppText variant="bodySmall" muted>
        Add one or more times for this same prayer. Each time sends a phone notification — even when
        PrayerCare is closed.
      </AppText>

      {value.length === 0 ? (
        <AppText variant="bodySmall" muted style={styles.empty}>
          No reminder times yet. Add morning, midday, evening — whatever helps you remember.
        </AppText>
      ) : (
        <View style={styles.list}>
          {value.map((item) => (
            <View key={item.key} style={styles.row}>
              <Pressable
                style={styles.timePress}
                onPress={() => openEdit(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit reminder ${formatReminderTimeLabel(item.time)}`}>
                <AppText style={styles.timeLabel}>{formatReminderTimeLabel(item.time)}</AppText>
                <AppText variant="bodySmall" muted>
                  Tap to edit
                </AppText>
              </Pressable>
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
      )}

      <Button title="+ Add another reminder" variant="secondary" onPress={openAdd} />

      {Platform.OS === 'android' && androidOpen ? (
        <DateTimePicker
          value={dateFromTime(draftTime)}
          mode="time"
          display="default"
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' && picking ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPicking(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <AppText variant="title">
                {editingKey ? 'Edit reminder time' : 'Add reminder time'}
              </AppText>
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
                      style={draftTime === preset.value ? styles.presetTextSelected : undefined}>
                      {preset.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <DateTimePicker
                value={dateFromTime(draftTime)}
                mode="time"
                display="spinner"
                onChange={onPickerChange}
              />
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="ghost" onPress={() => setPicking(false)} />
                <Button
                  title={editingKey ? 'Save time' : 'Add time'}
                  onPress={() => {
                    if (!commitTime(draftTime)) {
                      // duplicate
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'web' && picking ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPicking(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <AppText variant="title">
                {editingKey ? 'Edit reminder time' : 'Add reminder time'}
              </AppText>
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
                      style={draftTime === preset.value ? styles.presetTextSelected : undefined}>
                      {preset.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="ghost" onPress={() => setPicking(false)} />
                <Button title={editingKey ? 'Save time' : 'Add time'} onPress={() => commitTime(draftTime)} />
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
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
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
  modalActions: {
    gap: theme.spacing.sm,
  },
});
