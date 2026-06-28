import { useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BetaWelcomeModal } from '@/components/beta/BetaWelcomeModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { AppText } from '@/components/ui/AppText';
import { BETA_MODE } from '@/constants/beta';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { hasSeenBetaWelcome, markBetaWelcomeSeen } from '@/lib/beta-storage';

export function BetaOverlay() {
  const { session, isEmailVerified, needsOnboarding } = useAuth();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const isAuthenticated = Boolean(session && isEmailVerified && !needsOnboarding);
  const inTabs = segments[0] === '(tabs)';
  const bottomOffset = (inTabs ? 56 : 0) + insets.bottom + theme.spacing.md;

  useEffect(() => {
    if (!BETA_MODE || !isAuthenticated) return;

    let mounted = true;

    hasSeenBetaWelcome().then((seen) => {
      if (mounted && !seen) {
        setWelcomeVisible(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  async function handleWelcomeContinue() {
    await markBetaWelcomeSeen();
    setWelcomeVisible(false);
  }

  if (!BETA_MODE || !isAuthenticated) {
    return null;
  }

  return (
    <>
      <BetaWelcomeModal visible={welcomeVisible} onContinue={handleWelcomeContinue} />

      <View pointerEvents="box-none" style={[styles.fabContainer, { bottom: bottomOffset }]}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setFeedbackVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Share feedback">
          <AppText style={styles.fabEmoji}>💬</AppText>
          <AppText style={styles.fabLabel}>Share Feedback</AppText>
        </Pressable>
      </View>

      <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: theme.spacing.lg,
    left: theme.spacing.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPressed: {
    backgroundColor: theme.colors.accentDark,
  },
  fabEmoji: {
    fontSize: 18,
  },
  fabLabel: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
