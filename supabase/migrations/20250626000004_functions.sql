-- PrayerCare: domain functions (computed scheduling, prayer lifecycle)

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_leader_or_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
      AND gm.role IN ('leader', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.schedule_matches(
  p_schedule_type schedule_type,
  p_weekdays SMALLINT[],
  p_start_date DATE,
  p_check_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  day_of_week SMALLINT;
BEGIN
  IF p_check_date < p_start_date THEN
    RETURN FALSE;
  END IF;

  day_of_week := EXTRACT(DOW FROM p_check_date)::SMALLINT;

  CASE p_schedule_type
    WHEN 'once' THEN
      RETURN p_check_date = p_start_date;
    WHEN 'daily', 'until_answered' THEN
      RETURN TRUE;
    WHEN 'weekly' THEN
      RETURN day_of_week = EXTRACT(DOW FROM p_start_date)::SMALLINT;
    WHEN 'specific_weekdays' THEN
      RETURN day_of_week = ANY (p_weekdays);
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_prayer(p_prayer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prayers p
    WHERE p.id = p_prayer_id
      AND (
        (p.visibility = 'personal' AND p.creator_id = p_user_id)
        OR (
          p.visibility = 'group'
          AND p.group_id IS NOT NULL
          AND public.is_group_member(p.group_id, p_user_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_prayer(p_prayer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prayers p
    WHERE p.id = p_prayer_id
      AND (
        p.creator_id = p_user_id
        OR (
          p.group_id IS NOT NULL
          AND public.is_group_leader_or_admin(p.group_id, p_user_id)
        )
      )
  );
$$;

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
      )
    )
  ORDER BY p.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.handle_prayer_answered(
  p_prayer_id UUID,
  p_user_id UUID,
  p_praise_days INTEGER DEFAULT NULL
)
RETURNS public.prayers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prayer public.prayers;
  v_days INTEGER;
BEGIN
  IF NOT public.can_edit_prayer(p_prayer_id, p_user_id) THEN
    RAISE EXCEPTION 'Not allowed to mark this prayer as answered';
  END IF;

  SELECT COALESCE(p_praise_days, pr.praise_visibility_days)
  INTO v_days
  FROM public.profiles pr
  WHERE pr.id = p_user_id;

  UPDATE public.prayers
  SET
    status = 'answered',
    answered_at = NOW(),
    praise_visible_until = CURRENT_DATE + v_days
  WHERE id = p_prayer_id
  RETURNING * INTO v_prayer;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    p_prayer_id,
    p_user_id,
    'answered',
    jsonb_build_object('answered_at', NOW(), 'praise_visible_until', v_prayer.praise_visible_until)
  );

  RETURN v_prayer;
END;
$$;

CREATE OR REPLACE FUNCTION public.restart_prayer(
  p_prayer_id UUID,
  p_user_id UUID
)
RETURNS public.prayers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prayer public.prayers;
BEGIN
  IF NOT public.can_edit_prayer(p_prayer_id, p_user_id) THEN
    RAISE EXCEPTION 'Not allowed to restart this prayer';
  END IF;

  UPDATE public.prayers
  SET
    status = 'active',
    answered_at = NULL,
    praise_visible_until = NULL,
    is_hidden = FALSE
  WHERE id = p_prayer_id
  RETURNING * INTO v_prayer;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (p_prayer_id, p_user_id, 'restarted', '{}'::JSONB);

  RETURN v_prayer;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_prayer_activity(
  p_prayer_id UUID,
  p_user_id UUID,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS public.prayer_activity_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log public.prayer_activity_logs;
BEGIN
  IF NOT public.can_view_prayer(p_prayer_id, p_user_id) THEN
    RAISE EXCEPTION 'Not allowed to log activity for this prayer';
  END IF;

  INSERT INTO public.prayer_activity_logs (prayer_id, user_id, activity_date)
  VALUES (p_prayer_id, p_user_id, p_activity_date)
  ON CONFLICT (prayer_id, user_id, activity_date)
  DO UPDATE SET prayed_at = NOW()
  RETURNING * INTO v_log;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    p_prayer_id,
    p_user_id,
    'prayed',
    jsonb_build_object('activity_date', p_activity_date)
  );

  RETURN v_log;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prayers_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_prayer_answered(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restart_prayer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_prayer_activity(UUID, UUID, DATE) TO authenticated;
