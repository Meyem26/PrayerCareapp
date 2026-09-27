import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
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

  if (sent) {
    return (
      <BottomSheet
        visible={visible}
        onClose={handleClose}
        title="Thank you"
        footer={<Button title="Done" onPress={handleClose} />}>
        <AppText muted style={styles.sentBody}>
          Your feedback helps us make PrayerCare clearer, calmer, and more helpful for everyone.
        </AppText>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Share Feedback"
      subtitle="Tell us what is working and what is not. Every note goes directly to the team."
      footer={
        <>
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <Button title="Send Feedback" loading={loading} onPress={handleSubmit} />
          <Button title="Cancel" variant="ghost" onPress={handleClose} />
        </>
      }>
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 88,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  sentBody: {
    lineHeight: 24,
  },
});
