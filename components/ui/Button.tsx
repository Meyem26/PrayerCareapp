import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { theme } from '@/constants/theme';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => {
        const extraStyle = typeof style === 'function' ? style(state) : style;
        return [
          styles.base,
          styles[variant],
          isDisabled && styles.disabled,
          state.pressed && !isDisabled && styles.pressed,
          extraStyle,
        ];
      }}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.accent} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primary: {
    backgroundColor: theme.colors.accent,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondaryText: {
    color: theme.colors.text,
  },
  ghostText: {
    color: theme.colors.accent,
  },
});
