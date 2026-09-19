import { Platform, StyleSheet, View, type ViewProps, useWindowDimensions } from 'react-native';

import { theme } from '@/constants/theme';

/** iPhone 14/15 Pro Max logical width — full-bleed on phones, framed on larger web. */
const PHONE_MAX_WIDTH = 430;

/**
 * On web, keep the app in a phone-width column so Safari/Chrome match the native app.
 * On native, renders children unchanged.
 */
export function WebPhoneShell({ children, style, ...props }: ViewProps) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const framed = width > PHONE_MAX_WIDTH;

  return (
    <View style={[styles.shell, framed && styles.shellFramed, style]} {...props}>
      <View style={[styles.frame, framed && styles.frameFramed]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  shellFramed: {
    backgroundColor: '#EFECE7',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: PHONE_MAX_WIDTH,
    backgroundColor: theme.colors.background,
  },
  frameFramed: Platform.select({
    web: {
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(42,42,42,0.06), 0 12px 40px rgba(42,42,42,0.08)',
    },
    default: {},
  }),
});
