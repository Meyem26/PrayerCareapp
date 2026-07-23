import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewProps } from 'react-native';

import { theme } from '@/constants/theme';

type SkeletonProps = ViewProps & {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
};

export function Skeleton({
  height = 16,
  width = '100%',
  radius = theme.radius.sm,
  style,
  ...props
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { height, width, borderRadius: radius, opacity },
        style,
      ]}
      {...props}
    />
  );
}

export function PrayerListSkeleton() {
  return (
    <View style={styles.list} accessibilityLabel="Loading prayers">
      <Skeleton height={28} width="55%" radius={8} />
      <Skeleton height={64} radius={theme.radius.md} />
      <Skeleton height={18} width="90%" />
      <Skeleton height={92} radius={theme.radius.md} />
      <Skeleton height={92} radius={theme.radius.md} />
      <Skeleton height={92} radius={theme.radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.border,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
});
