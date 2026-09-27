import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type StepProgressProps = {
  current: number;
  total: number;
};

/** Segmented bar + "Step 2 of 6". `current` is 0-based. */
export function StepProgress({ current, total }: StepProgressProps) {
  return (
    <View
      style={styles.wrapper}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}>
      <View style={styles.track}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < current && styles.segmentDone,
              index === current && styles.segmentCurrent,
            ]}
          />
        ))}
      </View>
      <AppText variant="bodySmall" muted style={styles.caption}>
        Step {current + 1} of {total}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  track: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    maxWidth: 240,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  segmentDone: {
    backgroundColor: theme.colors.accent,
    opacity: 0.55,
  },
  segmentCurrent: {
    backgroundColor: theme.colors.accent,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});
