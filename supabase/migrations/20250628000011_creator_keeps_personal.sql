-- Personal vs group-only visibility when sharing prayers with a group

ALTER TABLE public.prayers
  ADD COLUMN IF NOT EXISTS creator_keeps_personal BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.prayers.creator_keeps_personal IS
  'When visibility=group: TRUE = creator still sees on Today; FALSE = group list only for creator.';

CREATE OR REPLACE FUNCTION public.get_prayers_for_date(p_user_id UUID, p_date DATE)
RETURNS SETOF public.prayers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.prayers p
  INNER JOIN public.prayer_schedules ps ON ps.prayer_id = p.id
  WHERE p.status = 'active'
    AND p.is_hidden = FALSE
    AND (ps.custom_end_date IS NULL OR ps.custom_end_date >= p_date)
    AND public.schedule_matches(ps.schedule_type, ps.weekdays, ps.start_date, p_date)
    AND (
      (p.visibility = 'personal' AND p.creator_id = p_user_id)
      OR (
        p.visibility = 'group'
        AND p.group_id IS NOT NULL
        AND public.is_group_member(p.group_id, p_user_id)
        AND NOT (p.creator_id = p_user_id AND p.creator_keeps_personal = FALSE)
      )
    )
  ORDER BY p.created_at ASC;
$$;

DROP FUNCTION IF EXISTS public.share_prayer_to_group(UUID, UUID);

CREATE OR REPLACE FUNCTION public.share_prayer_to_group(
  p_prayer_id UUID,
  p_group_id UUID,
  p_creator_keeps_personal BOOLEAN DEFAULT TRUE
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
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_group_member(p_group_id, v_user_id) THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  IF NOT public.can_edit_prayer(p_prayer_id, v_user_id) THEN
    RAISE EXCEPTION 'Not allowed to share this prayer';
  END IF;

  UPDATE public.prayers
  SET
    visibility = 'group',
    group_id = p_group_id,
    creator_keeps_personal = COALESCE(p_creator_keeps_personal, TRUE)
  WHERE id = p_prayer_id
  RETURNING * INTO v_prayer;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    p_prayer_id,
    v_user_id,
    'shared_to_group',
    jsonb_build_object(
      'group_id', p_group_id,
      'group_name', (SELECT name FROM prayer_groups WHERE id = p_group_id),
      'creator_keeps_personal', COALESCE(p_creator_keeps_personal, TRUE)
    )
  );

  RETURN v_prayer;
END;
$$;

DROP FUNCTION IF EXISTS public.create_personal_prayer(
  TEXT, TEXT, public.schedule_type, TEXT, DATE,
  TEXT, UUID, SMALLINT[], DATE, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID
);

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
  p_ai_prompt_snapshot TEXT DEFAULT NULL,
  p_group_id UUID DEFAULT NULL,
  p_creator_keeps_personal BOOLEAN DEFAULT TRUE
)
RETURNS public.prayers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prayer public.prayers;
  v_visibility public.prayer_visibility := 'personal';
  v_keeps_personal BOOLEAN := TRUE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please sign out and sign in again.';
  END IF;

  IF char_length(trim(p_title)) = 0 OR char_length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Title and prayer text are required.';
  END IF;

  IF p_group_id IS NOT NULL THEN
    IF NOT public.is_group_member(p_group_id, v_user_id) THEN
      RAISE EXCEPTION 'You are not a member of this group';
    END IF;
    v_visibility := 'group';
    v_keeps_personal := COALESCE(p_creator_keeps_personal, TRUE);
  END IF;

  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.prayers (
    creator_id, visibility, group_id, creator_keeps_personal,
    title, prayer_point, body, category_id, status, ai_generated, ai_prompt_snapshot
  )
  VALUES (
    v_user_id, v_visibility,
    CASE WHEN v_visibility = 'group' THEN p_group_id ELSE NULL END,
    v_keeps_personal,
    trim(p_title), NULLIF(trim(p_prayer_point), ''), trim(p_body),
    p_category_id, 'active', COALESCE(p_ai_generated, FALSE),
    NULLIF(trim(p_ai_prompt_snapshot), '')
  )
  RETURNING * INTO v_prayer;

  INSERT INTO public.prayer_schedules (
    prayer_id, schedule_type, weekdays, start_date, custom_end_date, timezone
  )
  VALUES (
    v_prayer.id, p_schedule_type, COALESCE(p_weekdays, '{}'),
    p_start_date, p_custom_end_date, COALESCE(p_timezone, 'UTC')
  );

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    v_prayer.id, v_user_id, 'created',
    jsonb_build_object(
      'schedule_type', p_schedule_type,
      'ai_generated', COALESCE(p_ai_generated, FALSE),
      'shared_to_group', v_visibility = 'group',
      'group_id', p_group_id,
      'creator_keeps_personal', v_keeps_personal
    )
  );

  IF p_scripture_reference IS NOT NULL AND p_scripture_text IS NOT NULL
     AND char_length(trim(p_scripture_reference)) > 0 AND char_length(trim(p_scripture_text)) > 0 THEN
    INSERT INTO public.scripture_snapshots (prayer_id, reference, text, translation_id, source)
    VALUES (
      v_prayer.id, trim(p_scripture_reference), trim(p_scripture_text),
      COALESCE(p_translation_id, 'NIV'),
      CASE WHEN COALESCE(p_ai_generated, FALSE) THEN 'ai'::public.scripture_source ELSE 'manual'::public.scripture_source END
    );
  END IF;

  RETURN v_prayer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_prayer_to_group(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_personal_prayer(
  TEXT, TEXT, public.schedule_type, TEXT, DATE,
  TEXT, UUID, SMALLINT[], DATE, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, BOOLEAN
) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_care_action_status(
  p_care_action_id UUID,
  p_status public.care_action_status
)
RETURNS public.care_actions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_action public.care_actions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_action FROM public.care_actions WHERE id = p_care_action_id;

  IF v_action.id IS NULL THEN
    RAISE EXCEPTION 'Care action not found';
  END IF;

  IF NOT public.can_view_prayer(v_action.prayer_id, v_user_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_action.created_by <> v_user_id
     AND NOT public.can_edit_prayer(v_action.prayer_id, v_user_id) THEN
    RAISE EXCEPTION 'Not allowed to update this care action';
  END IF;

  UPDATE public.care_actions
  SET
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END
  WHERE id = p_care_action_id
  RETURNING * INTO v_action;

  IF p_status = 'completed' THEN
    INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
    VALUES (
      v_action.prayer_id,
      v_user_id,
      'care_action_completed',
      jsonb_build_object('care_action_id', v_action.id, 'action_type', v_action.action_type)
    );
  END IF;

  RETURN v_action;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_care_action_status(UUID, public.care_action_status) TO authenticated;
