-- Phase 7: Group RPCs — join by code, member list, group prayers

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  display_name TEXT,
  role public.group_member_role,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to view group members';
  END IF;

  RETURN QUERY
  SELECT
    gm.id AS member_id,
    gm.user_id,
    p.display_name,
    gm.role,
    gm.joined_at
  FROM public.group_members gm
  INNER JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY
    CASE gm.role
      WHEN 'admin' THEN 1
      WHEN 'leader' THEN 2
      ELSE 3
    END,
    gm.joined_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS public.prayer_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group public.prayer_groups;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_group
  FROM public.prayer_groups
  WHERE lower(invite_code) = lower(trim(p_invite_code))
    AND is_active = TRUE;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group.id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group;
END;
$$;

CREATE OR REPLACE FUNCTION public.share_prayer_to_group(
  p_prayer_id UUID,
  p_group_id UUID
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
  SET visibility = 'group', group_id = p_group_id
  WHERE id = p_prayer_id
  RETURNING * INTO v_prayer;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    p_prayer_id,
    v_user_id,
    'shared_to_group',
    jsonb_build_object('group_id', p_group_id, 'group_name', (SELECT name FROM prayer_groups WHERE id = p_group_id))
  );

  RETURN v_prayer;
END;
$$;

-- Extend create_personal_prayer to support optional group sharing
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
  p_group_id UUID DEFAULT NULL
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
  END IF;

  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.prayers (
    creator_id, visibility, group_id, title, prayer_point, body,
    category_id, status, ai_generated, ai_prompt_snapshot
  )
  VALUES (
    v_user_id, v_visibility,
    CASE WHEN v_visibility = 'group' THEN p_group_id ELSE NULL END,
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
      'group_id', p_group_id
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

GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_prayer_to_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_personal_prayer(
  TEXT, TEXT, public.schedule_type, TEXT, DATE,
  TEXT, UUID, SMALLINT[], DATE, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID
) TO authenticated;
