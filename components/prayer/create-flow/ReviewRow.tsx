import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type ReviewRowProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  onEdit?: () => void;
  note?: string;
  last?: boolean;
};

export function ReviewRow({ label, value, children, onEdit, note, last }: ReviewRowProps) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {value ? <AppText style={styles.value}>{value}</AppText> : null}
        {children}
        {note ? (
          <AppText variant="bodySmall" muted>
            {note}
          </AppText>
        ) : null}
      </View>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label.toLowerCase()}`}
          onPress={onEdit}
          hitSlop={10}
          style={({ pressed }) => [styles.edit, pressed && styles.editPressed]}>
          <AppText accent style={styles.editText}>
            Edit
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  value: {
    fontWeight: '500',
  },
  edit: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  editPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  editText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
