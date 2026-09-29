import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type SettingRowProps = {
  label: string;
  /** Current choice. When absent the row reads as an invitation ("＋ Add a reminder"). */
  value?: string | null;
  placeholder: string;
  description?: string;
  actionLabel?: string;
  onPress: () => void;
  children?: ReactNode;
  last?: boolean;
};

/** A calm one-line setting that reveals its options only when tapped. */
export function SettingRow({
  label,
  value,
  placeholder,
  description,
  actionLabel,
  onPress,
  children,
  last,
}: SettingRowProps) {
  const isSet = Boolean(value);

  return (
    <View style={[styles.container, !last && styles.divider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.text}>
          <AppText variant="label" style={styles.label}>
            {label}
          </AppText>
          {isSet ? (
            <AppText style={styles.value}>{value}</AppText>
          ) : (
            <AppText accent style={styles.placeholder}>
              ＋ {placeholder}
            </AppText>
          )}
          {description ? (
            <AppText variant="bodySmall" muted>
              {description}
            </AppText>
          ) : null}
        </View>
        {isSet ? (
          <AppText accent style={styles.action}>
            {actionLabel ?? 'Change'}
          </AppText>
        ) : null}
      </Pressable>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xs,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 64,
    paddingVertical: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: theme.colors.textSecondary,
  },
  value: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    fontWeight: '600',
  },
  action: {
    fontWeight: '600',
    fontSize: 15,
  },
});
