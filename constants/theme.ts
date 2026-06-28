export const theme = {
  colors: {
    background: '#FAF9F7',
    surface: '#FFFFFF',
    text: '#2A2A2A',
    textSecondary: '#6E6E6E',
    textMuted: '#9A9A9A',
    accent: '#5B7B6A',
    accentLight: '#E8F0EC',
    accentDark: '#466556',
    gold: '#B8954A',
    goldLight: '#F5EFDF',
    border: '#E8E6E3',
    error: '#B44B4B',
    errorLight: '#FCEEEE',
    white: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
  },
  typography: {
    greeting: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '600' as const,
    },
    title: {
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 17,
      lineHeight: 26,
      fontWeight: '400' as const,
    },
    bodySmall: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
      letterSpacing: 0.3,
    },
  },
} as const;

export type Theme = typeof theme;
