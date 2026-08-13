import { SymbolView } from 'expo-symbols';
import { Image, StyleSheet, View } from 'react-native';

import { theme } from '@/constants/theme';

export type BrandTabName = 'today' | 'pray' | 'groups' | 'journey';

const INACTIVE_ICONS = {
  today: { ios: 'sun.max.fill' as const, android: 'sunny' as const, web: 'sunny' as const },
  pray: {
    ios: 'hands.sparkles.fill' as const,
    android: 'folded_hands' as const,
    web: 'folded_hands' as const,
  },
  groups: { ios: 'person.2.fill' as const, android: 'groups' as const, web: 'groups' as const },
  journey: {
    ios: 'book.fill' as const,
    android: 'auto_stories' as const,
    web: 'auto_stories' as const,
  },
};

type BrandTabIconProps = {
  name: BrandTabName;
  focused: boolean;
  size?: number;
};

/** Inactive: a simple symbol. Focused: the brand flame, so it travels with you. */
export function BrandTabIcon({ name, focused, size = 26 }: BrandTabIconProps) {
  if (focused) {
    return (
      <View style={styles.wrap}>
        <Image
          source={require('@/assets/images/brand-mark.png')}
          style={{ width: size + 2, height: size + 2 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SymbolView
        name={INACTIVE_ICONS[name]}
        size={size}
        tintColor={theme.colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
});
