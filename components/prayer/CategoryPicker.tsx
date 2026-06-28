import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { OptionCard } from '@/components/ui/OptionCard';
import { theme } from '@/constants/theme';
import type { PrayerCategory } from '@/types/prayer';

type CategoryPickerProps = {
  categories: PrayerCategory[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">Category</AppText>
      <View style={styles.options}>
        <OptionCard label="None" selected={value === null} onPress={() => onChange(null)} />
        {categories.map((category) => (
          <OptionCard
            key={category.id}
            label={category.label}
            selected={value === category.id}
            onPress={() => onChange(category.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  options: {
    gap: theme.spacing.sm,
  },
});
