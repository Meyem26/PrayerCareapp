import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import type { GroupWithMeta } from '@/types/group';

type GroupCardProps = {
  group: GroupWithMeta;
  onPress: () => void;
};

export function GroupCard({ group, onPress }: GroupCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <AppText style={styles.name}>{group.name}</AppText>
        {group.my_role === 'admin' || group.my_role === 'leader' ? (
          <View style={styles.badge}>
            <AppText variant="bodySmall" style={styles.badgeText}>
              {group.my_role === 'admin' ? 'Admin' : 'Leader'}
            </AppText>
          </View>
        ) : null}
      </View>
      {group.description ? (
        <AppText muted numberOfLines={2}>
          {group.description}
        </AppText>
      ) : (
        <AppText variant="bodySmall" muted>
          Private prayer group
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  pressed: {
    borderColor: theme.colors.accent,
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  badgeText: {
    color: theme.colors.accentDark,
    fontWeight: '500',
  },
});
