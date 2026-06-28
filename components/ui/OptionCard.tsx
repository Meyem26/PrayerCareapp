import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type OptionCardProps = {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
};

export function OptionCard({ label, description, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}>
      <View style={styles.content}>
        <AppText style={selected ? styles.labelSelected : undefined}>{label}</AppText>
        {description ? (
          <AppText variant="bodySmall" muted>
            {description}
          </AppText>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.check}>
          <AppText accent style={styles.checkMark}>
            ✓
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  cardPressed: {
    opacity: 0.9,
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  labelSelected: {
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  check: {
    width: 24,
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
