import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { theme } from '@/constants/theme';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export type SelectAction = {
  key: string;
  label: string;
  description?: string;
  onPress: () => void;
};

type SelectFieldProps<T extends string> = {
  label?: string;
  placeholder: string;
  sheetTitle: string;
  sheetSubtitle?: string;
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Extra rows under the options, e.g. "Create a new group". */
  actions?: SelectAction[];
  /** Show the selected option's description under its label in the field. */
  showSelectedDescription?: boolean;
};

export function SelectField<T extends string>({
  label,
  placeholder,
  sheetTitle,
  sheetSubtitle,
  options,
  value,
  onChange,
  actions = [],
  showSelectedDescription = true,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? sheetTitle}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list of choices"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          selected && styles.fieldFilled,
          pressed && styles.fieldPressed,
        ]}>
        <View style={styles.fieldText}>
          <AppText style={selected ? styles.valueText : styles.placeholderText} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </AppText>
          {selected?.description && showSelectedDescription ? (
            <AppText variant="bodySmall" muted numberOfLines={2}>
              {selected.description}
            </AppText>
          ) : null}
        </View>
        <AppText style={styles.chevron}>⌄</AppText>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
        subtitle={sheetSubtitle}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.rowText}>
                <AppText style={isSelected ? styles.rowLabelSelected : styles.rowLabel}>
                  {option.label}
                </AppText>
                {option.description ? (
                  <AppText variant="bodySmall" muted>
                    {option.description}
                  </AppText>
                ) : null}
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}

        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            onPress={() => {
              setOpen(false);
              action.onPress();
            }}
            style={({ pressed }) => [styles.row, styles.actionRow, pressed && styles.rowPressed]}>
            <View style={styles.rowText}>
              <AppText accent style={styles.actionLabel}>
                {action.label}
              </AppText>
              {action.description ? (
                <AppText variant="bodySmall" muted>
                  {action.description}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  label: {
    marginLeft: theme.spacing.xs,
  },
  field: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fieldFilled: {
    borderColor: theme.colors.accent,
  },
  fieldPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  fieldText: {
    flex: 1,
    gap: 2,
  },
  valueText: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textMuted,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginTop: -8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
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
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: theme.colors.text,
  },
  rowLabelSelected: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  actionRow: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  actionLabel: {
    fontWeight: '600',
  },
});
