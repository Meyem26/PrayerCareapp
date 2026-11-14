-- PrayerCare: persist signup language preference onto profiles.locale
-- profiles.locale already exists (default 'en'). This tightens allowed values
-- and copies locale from auth metadata on new accounts.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_locale_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_locale_check
  CHECK (locale IN ('en', 'fr', 'es'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen_locale TEXT;
  chosen_bible TEXT;
BEGIN
  chosen_locale := lower(coalesce(NEW.raw_user_meta_data ->> 'locale', 'en'));
  IF chosen_locale NOT IN ('en', 'fr', 'es') THEN
    chosen_locale := 'en';
  END IF;

  chosen_bible := CASE chosen_locale
    WHEN 'fr' THEN 'LSG1910'
    WHEN 'es' THEN 'RV1909'
    ELSE 'WEB'
  END;

  INSERT INTO public.profiles (id, display_name, locale, bible_translation_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    chosen_locale,
    chosen_bible
  );

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;
