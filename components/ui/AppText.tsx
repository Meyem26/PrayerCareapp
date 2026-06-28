import { StyleSheet, Text, type TextProps } from 'react-native';

import { theme } from '@/constants/theme';

type AppTextProps = TextProps & {
  variant?: 'greeting' | 'title' | 'body' | 'bodySmall' | 'label';
  muted?: boolean;
  accent?: boolean;
};

export function AppText({
  variant = 'body',
  muted,
  accent,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        muted && styles.muted,
        accent && styles.accent,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text,
  },
  greeting: theme.typography.greeting,
  title: theme.typography.title,
  body: theme.typography.body,
  bodySmall: theme.typography.bodySmall,
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  muted: {
    color: theme.colors.textSecondary,
  },
  accent: {
    color: theme.colors.accent,
  },
});
