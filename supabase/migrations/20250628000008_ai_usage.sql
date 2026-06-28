-- AI generation usage logging and create_prayer AI fields

CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('prayer', 'verse')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_generation_logs_user_created_idx
  ON public.ai_generation_logs (user_id, created_at DESC);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_generation_logs_insert_own ON public.ai_generation_logs;
CREATE POLICY ai_generation_logs_insert_own ON public.ai_generation_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_generation_logs_select_own ON public.ai_generation_logs;
CREATE POLICY ai_generation_logs_select_own ON public.ai_generation_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Extend create_personal_prayer with AI metadata
CREATE OR REPLACE FUNCTION public.create_personal_prayer(
  p_title TEXT,
  p_body TEXT,
  p_schedule_type public.schedule_type,
  p_timezone TEXT,
  p_start_date DATE,
  p_prayer_point TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_weekdays SMALLINT[] DEFAULT '{}',
  p_custom_end_date DATE DEFAULT NULL,
  p_scripture_reference TEXT DEFAULT NULL,
  p_scripture_text TEXT DEFAULT NULL,
  p_translation_id TEXT DEFAULT 'NIV',
  p_ai_generated BOOLEAN DEFAULT FALSE,
  p_ai_prompt_snapshot TEXT DEFAULT NULL
)
RETURNS public.prayers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prayer public.prayers;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please sign out and sign in again.';
  END IF;

  IF char_length(trim(p_title)) = 0 OR char_length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Title and prayer text are required.';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.prayers (
    creator_id,
    visibility,
    title,
    prayer_point,
    body,
    category_id,
    status,
    ai_generated,
    ai_prompt_snapshot
  )
  VALUES (
    v_user_id,
    'personal',
    trim(p_title),
    NULLIF(trim(p_prayer_point), ''),
    trim(p_body),
    p_category_id,
    'active',
    COALESCE(p_ai_generated, FALSE),
    NULLIF(trim(p_ai_prompt_snapshot), '')
  )
  RETURNING * INTO v_prayer;

  INSERT INTO public.prayer_schedules (
    prayer_id,
    schedule_type,
    weekdays,
    start_date,
    custom_end_date,
    timezone
  )
  VALUES (
    v_prayer.id,
    p_schedule_type,
    COALESCE(p_weekdays, '{}'),
    p_start_date,
    p_custom_end_date,
    COALESCE(p_timezone, 'UTC')
  );

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    v_prayer.id,
    v_user_id,
    'created',
    jsonb_build_object(
      'schedule_type', p_schedule_type,
      'ai_generated', COALESCE(p_ai_generated, FALSE)
    )
  );

  IF p_scripture_reference IS NOT NULL
     AND p_scripture_text IS NOT NULL
     AND char_length(trim(p_scripture_reference)) > 0
     AND char_length(trim(p_scripture_text)) > 0 THEN
    INSERT INTO public.scripture_snapshots (
      prayer_id,
      reference,
      text,
      translation_id,
      source
    )
    VALUES (
      v_prayer.id,
      trim(p_scripture_reference),
      trim(p_scripture_text),
      COALESCE(p_translation_id, 'NIV'),
      CASE WHEN COALESCE(p_ai_generated, FALSE) THEN 'ai'::public.scripture_source ELSE 'manual'::public.scripture_source END
    );
  END IF;

  RETURN v_prayer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_personal_prayer(
  TEXT, TEXT, public.schedule_type, TEXT, DATE,
  TEXT, UUID, SMALLINT[], DATE, TEXT, TEXT, TEXT, BOOLEAN, TEXT
) TO authenticated;
