import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type ToastTone = 'success' | 'info' | 'gentle';

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions | string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<ToastTone>('gentle');

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 12, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (options: ToastOptions | string) => {
      const next = typeof options === 'string' ? { message: options } : options;
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setMessage(next.message);
      setTone(next.tone ?? 'gentle');
      setVisible(true);
      opacity.setValue(0);
      translateY.setValue(12);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();

      hideTimer.current = setTimeout(hide, next.durationMs ?? 2800);
    },
    [hide, opacity, translateY],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            tone === 'success' && styles.success,
            tone === 'info' && styles.info,
            {
              bottom: Math.max(insets.bottom, 16) + 64,
              opacity,
              transform: [{ translateY }],
            },
          ]}>
          <View style={styles.inner}>
            <AppText style={styles.message}>{message}</AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 1000,
  },
  inner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#2A2A2A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  success: {
    borderColor: theme.colors.accentLight,
  },
  info: {
    borderColor: theme.colors.border,
  },
  message: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
});
