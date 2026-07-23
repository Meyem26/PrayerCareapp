import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { theme } from '@/constants/theme';

type EmptyStateProps = ViewProps & {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, body, actionLabel, onAction, style, ...props }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]} {...props}>
      <View style={styles.accent} />
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText muted style={styles.body}>
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  accent: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.gold,
    opacity: 0.7,
    marginBottom: theme.spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  button: {
    marginTop: theme.spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 280,
  },
});
