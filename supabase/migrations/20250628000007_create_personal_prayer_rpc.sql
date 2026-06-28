-- Reliable prayer creation via SECURITY DEFINER (avoids RLS insert edge cases)
-- Still enforces auth.uid() — only the signed-in user can create their own prayer.

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
  p_translation_id TEXT DEFAULT 'NIV'
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

  -- Ensure profile exists (fixes users created before signup trigger)
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
    status
  )
  VALUES (
    v_user_id,
    'personal',
    trim(p_title),
    NULLIF(trim(p_prayer_point), ''),
    trim(p_body),
    p_category_id,
    'active'
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
    jsonb_build_object('schedule_type', p_schedule_type)
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
      'manual'
    );
  END IF;

  RETURN v_prayer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_personal_prayer(
  TEXT, TEXT, public.schedule_type, TEXT, DATE,
  TEXT, UUID, SMALLINT[], DATE, TEXT, TEXT, TEXT
) TO authenticated;

-- Extra SELECT policy so creators always read their own rows (helps lists + RETURNING)
DROP POLICY IF EXISTS prayers_select_creator ON public.prayers;

CREATE POLICY prayers_select_creator ON public.prayers
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

-- Allow users to create their own profile if trigger missed them
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
