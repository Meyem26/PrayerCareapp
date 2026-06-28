import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type TextAreaProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function TextArea({ label, error, style, ...props }: TextAreaProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? (
        <AppText variant="bodySmall" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  label: {
    marginLeft: theme.spacing.xs,
  },
  input: {
    minHeight: 120,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 17,
    lineHeight: 26,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
});
