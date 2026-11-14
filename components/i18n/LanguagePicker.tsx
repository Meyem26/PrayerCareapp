import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { OptionCard } from '@/components/ui/OptionCard';
import { LANGUAGE_OPTIONS, type AppLocale } from '@/constants/languages';
import { theme } from '@/constants/theme';

type LanguagePickerProps = {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
  title?: string;
  subtitle?: string;
};

/** Calm single-select for English / Français / Español. */
export function LanguagePicker({ value, onChange, title, subtitle }: LanguagePickerProps) {
  return (
    <View style={styles.wrap}>
      {title ? (
        <View style={styles.heading}>
          <AppText variant="greeting">{title}</AppText>
          {subtitle ? (
            <AppText muted style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View style={styles.options}>
        {LANGUAGE_OPTIONS.map((option) => (
          <OptionCard
            key={option.code}
            label={option.nativeName}
            selected={value === option.code}
            onPress={() => onChange(option.code)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.md,
  },
  heading: {
    gap: theme.spacing.sm,
  },
  subtitle: {
    lineHeight: 24,
  },
  options: {
    gap: theme.spacing.sm,
  },
});
