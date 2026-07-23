import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Cross-platform confirm dialog (replaces Alert.alert for web + native). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />
      <View style={styles.card}>
        <AppText variant="title">{title}</AppText>
        <AppText muted style={styles.message}>
          {message}
        </AppText>
        <View style={styles.actions}>
          <Button title={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} />
          <Button
            title={confirmLabel}
            loading={loading}
            onPress={onConfirm}
            style={destructive ? styles.destructive : undefined}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 42, 42, 0.35)',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      web: { maxWidth: 420, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  message: {
    lineHeight: 24,
  },
  actions: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  destructive: {
    backgroundColor: theme.colors.error,
  },
});
