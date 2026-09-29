import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

export function goBackOrHome() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}

type HeaderBackButtonProps = {
  tintColor?: string;
  label?: string;
};

/**
 * iOS only draws a native back button when there is a screen beneath it in the *same* stack,
 * so the first screen of a nested stack (e.g. a prayer opened from a tab, or reached via
 * create → replace) would otherwise have no way out.
 */
export function HeaderBackButton({ tintColor = theme.colors.accent, label = 'Back' }: HeaderBackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={goBackOrHome}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
        size={Platform.OS === 'ios' ? 20 : 24}
        weight="semibold"
        tintColor={tintColor}
      />
      {Platform.OS === 'ios' ? (
        <AppText style={[styles.label, { color: tintColor }]}>{label}</AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingRight: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
  },
});
