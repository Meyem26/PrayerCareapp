import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export type OverflowMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type OverflowMenuProps = {
  items: OverflowMenuItem[];
  accessibilityLabel?: string;
};

export function OverflowMenu({ items, accessibilityLabel = 'More options' }: OverflowMenuProps) {
  const [visible, setVisible] = useState(false);

  if (items.length === 0) return null;

  function handleSelect(item: OverflowMenuItem) {
    setVisible(false);
    item.onPress();
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={12}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={() => setVisible(true)}>
        <AppText style={styles.triggerIcon}>⋯</AppText>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            {items.map((item, index) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.menuItem,
                  index < items.length - 1 && styles.menuItemBorder,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => handleSelect(item)}>
                <AppText style={item.destructive ? styles.destructiveText : undefined}>
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  triggerPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  triggerIcon: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: -6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 42, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: theme.spacing.xl,
    paddingRight: theme.spacing.lg,
  },
  menu: {
    minWidth: 220,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.accentLight,
  },
  destructiveText: {
    color: theme.colors.error,
  },
});
