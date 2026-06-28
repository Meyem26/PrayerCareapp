-- Phase 9: Spiritual history by date + user analytics

CREATE OR REPLACE FUNCTION public.get_history_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheduled JSONB;
  v_answered JSONB;
  v_prayed JSONB;
  v_praise JSONB;
  v_care JSONB;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'prayer_point', p.prayer_point
  ) ORDER BY p.title), '[]'::JSONB)
  INTO v_scheduled
  FROM public.prayers p
  INNER JOIN public.prayer_schedules ps ON ps.prayer_id = p.id
  WHERE ps.start_date <= p_date
    AND (ps.custom_end_date IS NULL OR ps.custom_end_date >= p_date)
    AND public.schedule_matches(ps.schedule_type, ps.weekdays, ps.start_date, p_date)
    AND (p.answered_at IS NULL OR p.answered_at::date > p_date)
    AND p.created_at::date <= p_date
    AND (
      (p.visibility = 'personal' AND p.creator_id = p_user_id)
      OR (
        p.visibility = 'group'
        AND p.group_id IS NOT NULL
        AND public.is_group_member(p.group_id, p_user_id)
        AND NOT (p.creator_id = p_user_id AND p.creator_keeps_personal = FALSE)
      )
    );

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'answered_at', p.answered_at
  ) ORDER BY p.answered_at), '[]'::JSONB)
  INTO v_answered
  FROM public.prayers p
  WHERE public.can_view_prayer(p.id, p_user_id)
    AND p.answered_at IS NOT NULL
    AND p.answered_at::date = p_date;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'prayer_id', pal.prayer_id,
    'title', p.title,
    'prayed_at', pal.prayed_at
  ) ORDER BY pal.prayed_at), '[]'::JSONB)
  INTO v_prayed
  FROM public.prayer_activity_logs pal
  INNER JOIN public.prayers p ON p.id = pal.prayer_id
  WHERE pal.user_id = p_user_id
    AND pal.activity_date = p_date
    AND public.can_view_prayer(p.id, p_user_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'prayer_id', pr.prayer_id,
    'title', p.title,
    'body', left(pr.body, 200)
  ) ORDER BY pr.created_at), '[]'::JSONB)
  INTO v_praise
  FROM public.praise_reports pr
  INNER JOIN public.prayers p ON p.id = pr.prayer_id
  WHERE pr.author_id = p_user_id
    AND pr.created_at::date = p_date;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ca.id,
    'prayer_id', ca.prayer_id,
    'prayer_title', p.title,
    'action_type', ca.action_type,
    'custom_label', ca.custom_label,
    'status', ca.status,
    'due_date', ca.due_date,
    'completed_at', ca.completed_at
  ) ORDER BY ca.created_at), '[]'::JSONB)
  INTO v_care
  FROM public.care_actions ca
  INNER JOIN public.prayers p ON p.id = ca.prayer_id
  WHERE public.can_view_prayer(ca.prayer_id, p_user_id)
    AND (
      ca.created_at::date = p_date
      OR ca.due_date = p_date
      OR ca.completed_at::date = p_date
    );

  RETURN jsonb_build_object(
    'scheduled', v_scheduled,
    'answered', v_answered,
    'prayed', v_prayed,
    'praise', v_praise,
    'care_actions', v_care
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_history_activity_dates(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS DATE[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  RETURN ARRAY(
    SELECT DISTINCT d
    FROM (
      SELECT pal.activity_date AS d
      FROM public.prayer_activity_logs pal
      WHERE pal.user_id = p_user_id
        AND pal.activity_date BETWEEN v_start AND v_end

      UNION

      SELECT p.answered_at::date AS d
      FROM public.prayers p
      WHERE public.can_view_prayer(p.id, p_user_id)
        AND p.answered_at IS NOT NULL
        AND p.answered_at::date BETWEEN v_start AND v_end

      UNION

      SELECT pr.created_at::date AS d
      FROM public.praise_reports pr
      WHERE pr.author_id = p_user_id
        AND pr.created_at::date BETWEEN v_start AND v_end

      UNION

      SELECT ca.completed_at::date AS d
      FROM public.care_actions ca
      WHERE public.can_view_prayer(ca.prayer_id, p_user_id)
        AND ca.completed_at IS NOT NULL
        AND ca.completed_at::date BETWEEN v_start AND v_end
    ) activity
    WHERE d IS NOT NULL
    ORDER BY d
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_prayer_analytics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active INTEGER;
  v_answered INTEGER;
  v_care_pending INTEGER;
  v_care_completed INTEGER;
  v_streak INTEGER := 0;
  v_check DATE;
  v_has_today BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_active
  FROM public.prayers p
  WHERE p.creator_id = p_user_id
    AND p.status = 'active'
    AND p.is_hidden = FALSE;

  SELECT COUNT(*)::INTEGER
  INTO v_answered
  FROM public.prayers p
  WHERE p.creator_id = p_user_id
    AND p.status = 'answered';

  SELECT COUNT(*)::INTEGER
  INTO v_care_pending
  FROM public.care_actions ca
  INNER JOIN public.prayers p ON p.id = ca.prayer_id
  WHERE p.creator_id = p_user_id
    AND ca.status IN ('pending', 'in_progress');

  SELECT COUNT(*)::INTEGER
  INTO v_care_completed
  FROM public.care_actions ca
  INNER JOIN public.prayers p ON p.id = ca.prayer_id
  WHERE p.creator_id = p_user_id
    AND ca.status = 'completed';

  SELECT EXISTS (
    SELECT 1
    FROM public.prayer_activity_logs
    WHERE user_id = p_user_id AND activity_date = CURRENT_DATE
  ) INTO v_has_today;

  v_check := CASE WHEN v_has_today THEN CURRENT_DATE ELSE CURRENT_DATE - 1 END;

  WHILE EXISTS (
    SELECT 1
    FROM public.prayer_activity_logs
    WHERE user_id = p_user_id AND activity_date = v_check
  ) LOOP
    v_streak := v_streak + 1;
    v_check := v_check - 1;
  END LOOP;

  RETURN jsonb_build_object(
    'active_prayers', v_active,
    'answered_prayers', v_answered,
    'care_actions_pending', v_care_pending,
    'care_actions_completed', v_care_completed,
    'prayer_streak', v_streak
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_history_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_history_activity_dates(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_prayer_analytics(UUID) TO authenticated;
