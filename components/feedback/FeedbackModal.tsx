import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { submitBetaFeedback } from '@/lib/api/feedback';

type FeedbackModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [mostValuable, setMostValuable] = useState('');
  const [mostFrustrating, setMostFrustrating] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function resetForm() {
    setFeedbackText('');
    setMostValuable('');
    setMostFrustrating('');
    setError(null);
    setSent(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const result = await submitBetaFeedback({
      feedbackText,
      mostValuableFeature: mostValuable,
      mostFrustrating,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSent(true);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.handle} />

            {sent ? (
              <View style={styles.sentBlock}>
                <AppText variant="title">Thank you</AppText>
                <AppText muted style={styles.sentBody}>
                  Your feedback helps us make PrayerCare clearer, calmer, and more helpful for
                  everyone.
                </AppText>
                <Button title="Done" onPress={handleClose} />
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <AppText variant="title">Share Feedback</AppText>
                <AppText muted>
                  Tell us what is working and what is not. Every note goes directly to the team.
                </AppText>

                <TextArea
                  label="Your thoughts"
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder={'e.g. "The prayer reminder didn\'t work."'}
                  style={styles.field}
                />

                <TextArea
                  label="What is the one feature you found most valuable?"
                  value={mostValuable}
                  onChangeText={setMostValuable}
                  placeholder="e.g. Journey calendar, group prayers..."
                  style={styles.field}
                />

                <TextArea
                  label="What frustrated you the most?"
                  value={mostFrustrating}
                  onChangeText={setMostFrustrating}
                  placeholder={'e.g. "I\'d love to sort prayers by category."'}
                  style={styles.field}
                />

                {error ? <AppText style={styles.error}>{error}</AppText> : null}

                <Button title="Send Feedback" loading={loading} onPress={handleSubmit} />
                <Button title="Cancel" variant="ghost" onPress={handleClose} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 42, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
    paddingBottom: theme.spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  field: {
    minHeight: 88,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  sentBlock: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    alignItems: 'stretch',
  },
  sentBody: {
    lineHeight: 24,
  },
});
