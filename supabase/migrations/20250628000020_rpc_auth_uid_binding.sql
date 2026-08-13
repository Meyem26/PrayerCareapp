-- Harden SECURITY DEFINER RPCs: caller-supplied p_user_id must equal auth.uid().
-- Prevents IDOR (acting as / reading another user's prayers via RPC).

CREATE OR REPLACE FUNCTION public.get_prayers_for_date(p_user_id UUID, p_date DATE)
RETURNS SETOF public.prayers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.prayers p
  INNER JOIN public.prayer_schedules ps ON ps.prayer_id = p.id
  WHERE p.status = 'active'
    AND p.is_hidden = FALSE
    AND (ps.custom_end_date IS NULL OR ps.custom_end_date >= p_date)
    AND public.schedule_matches(ps.schedule_type, ps.weekdays, ps.start_date, p_date)
    AND (
      (p.visibility = 'personal' AND p.creator_id = v_user_id)
      OR (
        p.visibility = 'group'
        AND p.group_id IS NOT NULL
        AND public.is_group_member(p.group_id, v_user_id)
        AND NOT (p.creator_id = v_user_id AND p.creator_keeps_personal = FALSE)
      )
    )
  ORDER BY p.created_at ASC;
END;
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
  v_user_id UUID := auth.uid();
  v_prayer public.prayers;
  v_days INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT public.can_edit_prayer(p_prayer_id, v_user_id) THEN
    RAISE EXCEPTION 'Not allowed to mark this prayer as answered';
  END IF;

  SELECT COALESCE(p_praise_days, pr.praise_visibility_days)
  INTO v_days
  FROM public.profiles pr
  WHERE pr.id = v_user_id;

  UPDATE public.prayers
  SET
    status = 'answered',
    answered_at = NOW(),
    praise_visible_until = CURRENT_DATE + COALESCE(v_days, 7)
  WHERE id = p_prayer_id
  RETURNING * INTO v_prayer;

  IF v_prayer.id IS NULL THEN
    RAISE EXCEPTION 'Prayer not found';
  END IF;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    p_prayer_id,
    v_user_id,
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
  v_user_id UUID := auth.uid();
  v_prayer public.prayers;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT public.can_edit_prayer(p_prayer_id, v_user_id) THEN
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

  IF v_prayer.id IS NULL THEN
    RAISE EXCEPTION 'Prayer not found';
  END IF;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (p_prayer_id, v_user_id, 'restarted', '{}'::JSONB);

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
  v_user_id UUID := auth.uid();
  v_log public.prayer_activity_logs;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT public.can_view_prayer(p_prayer_id, v_user_id) THEN
    RAISE EXCEPTION 'Not allowed to log activity for this prayer';
  END IF;

  INSERT INTO public.prayer_activity_logs (prayer_id, user_id, activity_date)
  VALUES (p_prayer_id, v_user_id, p_activity_date)
  ON CONFLICT (prayer_id, user_id, activity_date)
  DO UPDATE SET prayed_at = NOW()
  RETURNING * INTO v_log;

  INSERT INTO public.prayer_timeline_events (prayer_id, actor_id, event_type, metadata)
  VALUES (
    p_prayer_id,
    v_user_id,
    'prayed',
    jsonb_build_object('activity_date', p_activity_date)
  );

  RETURN v_log;
END;
$$;

-- Subscription helpers: only allow querying your own entitlements
CREATE OR REPLACE FUNCTION public.user_subscription_tier(p_user_id UUID DEFAULT auth.uid())
RETURNS public.subscription_tier
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tier public.subscription_tier;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT COALESCE(
    (
      SELECT s.tier
      FROM public.subscriptions s
      WHERE s.user_id = v_user_id
        AND s.status IN ('trialing', 'active')
      ORDER BY s.updated_at DESC
      LIMIT 1
    ),
    (SELECT pr.subscription_tier FROM public.profiles pr WHERE pr.id = v_user_id),
    'free'::public.subscription_tier
  )
  INTO v_tier;

  RETURN v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_feature(
  p_feature_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_enabled BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT COALESCE(
    (
      SELECT pe.enabled
      FROM public.plan_entitlements pe
      WHERE pe.tier = public.user_subscription_tier(v_user_id)
        AND pe.feature_key = p_feature_key
    ),
    FALSE
  )
  INTO v_enabled;

  RETURN v_enabled;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_feature_limit(
  p_feature_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT pe.limit_value
  INTO v_limit
  FROM public.plan_entitlements pe
  WHERE pe.tier = public.user_subscription_tier(v_user_id)
    AND pe.feature_key = p_feature_key;

  RETURN v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prayers_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_prayer_answered(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restart_prayer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_prayer_activity(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_feature(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_feature_limit(TEXT, UUID) TO authenticated;
