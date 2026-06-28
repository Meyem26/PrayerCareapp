import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';

type ScreenProps = ViewProps & {
  centered?: boolean;
  padded?: boolean;
};

export function Screen({ centered, padded = true, style, children, ...props }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.md,
          paddingHorizontal: padded ? theme.spacing.lg : 0,
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
    <Screen centered>
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
