import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type BetaWelcomeModalProps = {
  visible: boolean;
  onContinue: () => void;
};

export function BetaWelcomeModal({ visible, onContinue }: BetaWelcomeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <AppText variant="label" style={styles.badgeText}>
              BETA
            </AppText>
          </View>

          <AppText variant="greeting" style={styles.title}>
            Welcome to PrayerCare Beta
          </AppText>

          <AppText muted style={styles.body}>
            Thank you for helping us improve PrayerCare.
          </AppText>

          <AppText style={styles.body}>
            Your feedback will help us build a tool that serves individuals, churches, and
            ministries in their prayer and care journey.
          </AppText>

          <AppText muted style={styles.body}>
            If you notice anything confusing or that could be improved, tap{' '}
            <AppText accent>Share Feedback</AppText> anytime — we would love to hear from you.
          </AppText>

          <Button title="Continue" onPress={onContinue} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 42, 0.45)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.goldLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.gold,
  },
  title: {
    textAlign: 'left',
  },
  body: {
    lineHeight: 26,
  },
  button: {
    marginTop: theme.spacing.sm,
  },
});
