export const APP_LOCALES = ['en', 'fr', 'es'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'en';

export type LanguageOption = {
  code: AppLocale;
  /** Native display name shown in the language picker. */
  nativeName: string;
  /** Short English label for admin/debug only. */
  englishName: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && APP_LOCALES.includes(value as AppLocale));
}

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  if (!value) return DEFAULT_APP_LOCALE;
  const short = value.trim().toLowerCase().split(/[-_]/)[0];
  return isAppLocale(short) ? short : DEFAULT_APP_LOCALE;
}

/** Default auto-fetch Bible translation for each app language. */
export const DEFAULT_BIBLE_BY_LOCALE: Record<AppLocale, string> = {
  en: 'WEB',
  fr: 'LSG1910',
  es: 'RV1909',
};

export function getDefaultBibleTranslationId(locale: AppLocale): string {
  return DEFAULT_BIBLE_BY_LOCALE[locale];
}
