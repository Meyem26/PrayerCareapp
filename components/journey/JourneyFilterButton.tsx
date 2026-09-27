import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { JOURNEY_FILTERS, type JourneyFilter } from '@/components/journey/journey-utils';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { theme } from '@/constants/theme';

type JourneyFilterButtonProps = {
  value: JourneyFilter;
  counts: Record<JourneyFilter, number>;
  onChange: (value: JourneyFilter) => void;
};

export function JourneyFilterButton({ value, counts, onChange }: JourneyFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const selected = JOURNEY_FILTERS.find((item) => item.value === value) ?? JOURNEY_FILTERS[0];
  const isFiltered = value !== 'all';

  return (
    <>
      <View style={styles.pillRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filter: ${selected.label}`}
          accessibilityHint="Choose which prayers to show"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.pill,
            isFiltered && styles.pillActive,
            pressed && styles.pillPressed,
          ]}>
          <AppText style={[styles.icon, isFiltered && styles.textActive]}>☰</AppText>
          <AppText variant="bodySmall" style={[styles.pillText, isFiltered && styles.textActive]}>
            {isFiltered ? selected.label : 'Filter'}
          </AppText>
        </Pressable>
        {isFiltered ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
            hitSlop={8}
            onPress={() => onChange('all')}
            style={styles.clear}>
            <AppText style={styles.clearText}>×</AppText>
          </Pressable>
        ) : null}
      </View>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Show"
        subtitle="Choose which part of your journey to look back on.">
        {JOURNEY_FILTERS.map((item) => {
          const isSelected = item.value === value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => {
                onChange(item.value);
                setOpen(false);
              }}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.rowText}>
                <AppText style={isSelected ? styles.rowLabelSelected : undefined}>
                  {item.label}
                </AppText>
                <AppText variant="bodySmall" muted>
                  {item.description}
                </AppText>
              </View>
              <AppText variant="bodySmall" muted style={styles.count}>
                {counts[item.value]}
              </AppText>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillActive: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
  },
  pillPressed: {
    opacity: 0.85,
  },
  icon: {
    fontSize: 13,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  pillText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  textActive: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  clear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 20,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
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
  rowLabelSelected: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  count: {
    minWidth: 20,
    textAlign: 'right',
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
});
