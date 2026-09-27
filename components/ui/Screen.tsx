import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsTabScreen } from '@/components/navigation/TabScreenContext';
import { theme } from '@/constants/theme';

type ScreenProps = ViewProps & {
  centered?: boolean;
  padded?: boolean;
  /**
   * Also apply the top safe-area inset.
   * Use on full-bleed screens without a nav header (auth, onboarding).
   * Leave false under stack/tab headers — the header already clears the status bar.
   * The bottom inset (home indicator / Android nav bar) is always handled, except inside
   * tabs where the tab bar owns it.
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
  const isTabScreen = useIsTabScreen();
  const { width } = useWindowDimensions();

  // Tighter side padding on phone-width web (and small phones) — closer to native density.
  const horizontal =
    padded
      ? Platform.OS === 'web' || width < 400
        ? theme.spacing.md
        : theme.spacing.lg
      : 0;

  const paddingTop = safe ? insets.top + theme.spacing.md : 0;
  const bottomInset = isTabScreen ? 0 : insets.bottom;
  const paddingBottom = safe
    ? insets.bottom + theme.spacing.md
    : bottomInset + (padded ? theme.spacing.md : 0);

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
