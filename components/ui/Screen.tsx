import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type ScreenProps = ViewProps & {
  centered?: boolean;
  padded?: boolean;
  /**
   * Apply device safe-area insets.
   * Use on full-bleed screens without a nav header (auth, onboarding).
   * Leave false under stack/tab headers so content matches the native app.
   */
  safe?: boolean;
};

export function Screen({
  centered,
  padded = true,
  safe = false,
  style,
  children,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Tighter side padding on phone-width web (and small phones) — closer to native density.
  const horizontal =
    padded
      ? Platform.OS === 'web' || width < 400
        ? theme.spacing.md
        : theme.spacing.lg
      : 0;

  const paddingTop = safe ? insets.top + theme.spacing.md : 0;
  const paddingBottom = safe ? insets.bottom + theme.spacing.md : padded ? theme.spacing.md : 0;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop,
          paddingBottom,
          paddingHorizontal: horizontal,
        },
        centered && styles.centered,
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

export function LoadingScreen() {
  return (
    <Screen centered safe>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
