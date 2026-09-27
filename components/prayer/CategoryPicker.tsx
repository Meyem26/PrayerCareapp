import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import type { PrayerCategory } from '@/types/prayer';

const NO_CATEGORY = '__none__';

type CategoryPickerProps = {
  categories: PrayerCategory[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  label?: string;
};

export function CategoryPicker({ categories, value, onChange, label }: CategoryPickerProps) {
  const options: SelectOption<string>[] = [
    ...categories.map((category) => ({ value: category.id, label: category.label })),
    { value: NO_CATEGORY, label: 'No specific category' },
  ];

  return (
    <SelectField
      label={label}
      placeholder="Choose a category"
      sheetTitle="What is this prayer about?"
      sheetSubtitle="Categories help you find and reflect on prayers later."
      options={options}
      value={value}
      onChange={(next) => onChange(next === NO_CATEGORY ? null : next)}
    />
  );
}
