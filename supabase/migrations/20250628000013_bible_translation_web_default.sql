-- Default Bible translation to free public-domain WEB (was NIV)

ALTER TABLE public.profiles
  ALTER COLUMN bible_translation_id SET DEFAULT 'WEB';

UPDATE public.profiles
SET bible_translation_id = 'WEB'
WHERE bible_translation_id IN ('NIV', 'ESV', 'CSB', 'LSG');
