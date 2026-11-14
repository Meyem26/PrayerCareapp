import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { useI18n } from '@/contexts/I18nContext';
import { translateCategorySlug } from '@/lib/i18n';
import type { PrayerCategory } from '@/types/prayer';

const NO_CATEGORY = '__none__';

type CategoryPickerProps = {
  categories: PrayerCategory[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  label?: string;
};

export function CategoryPicker({ categories, value, onChange, label }: CategoryPickerProps) {
  const { t } = useI18n();
  const options: SelectOption<string>[] = [
    ...categories.map((category) => ({
      value: category.id,
      label: translateCategorySlug(category.slug, category.label),
    })),
    { value: NO_CATEGORY, label: t('prayer.noCategory') },
  ];

  return (
    <SelectField
      label={label}
      placeholder={t('prayer.chooseCategory')}
      sheetTitle={t('prayer.stepCategoryTitle')}
      sheetSubtitle={t('prayer.categorySheetSubtitle')}
      options={options}
      value={value}
      onChange={(next) => onChange(next === NO_CATEGORY ? null : next)}
    />
  );
}
