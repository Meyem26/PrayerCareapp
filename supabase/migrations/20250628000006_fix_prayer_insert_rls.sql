-- Fix: allow authenticated users to create personal prayers and related rows

-- Backfill profiles for users created before the signup trigger existed
INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

INSERT INTO public.notification_preferences (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences np WHERE np.user_id = p.id
);

-- Ensure authenticated role has table access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Helper: is the current user the creator of this prayer?
CREATE OR REPLACE FUNCTION public.is_prayer_creator(p_prayer_id UUID, p_user_id UUID)
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
      AND p.creator_id = p_user_id
  );
$$;

-- Prayers: recreate insert policy (explicit personal + group paths)
DROP POLICY IF EXISTS prayers_insert ON public.prayers;

CREATE POLICY prayers_insert ON public.prayers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND creator_id = auth.uid()
    AND (
      (visibility = 'personal'::public.prayer_visibility AND group_id IS NULL)
      OR (
        visibility = 'group'::public.prayer_visibility
        AND group_id IS NOT NULL
        AND public.is_group_member(group_id, auth.uid())
      )
    )
  );

-- Schedules: allow creator to add schedule right after creating prayer
DROP POLICY IF EXISTS prayer_schedules_insert ON public.prayer_schedules;

CREATE POLICY prayer_schedules_insert ON public.prayer_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_prayer_creator(prayer_id, auth.uid())
    OR public.can_edit_prayer(prayer_id, auth.uid())
  );

-- Timeline: allow creator to log events on their prayers
DROP POLICY IF EXISTS prayer_timeline_events_insert ON public.prayer_timeline_events;

CREATE POLICY prayer_timeline_events_insert ON public.prayer_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      public.is_prayer_creator(prayer_id, auth.uid())
      OR public.can_view_prayer(prayer_id, auth.uid())
    )
  );

-- Scripture snapshots: missing insert policy (needed when saving a verse)
DROP POLICY IF EXISTS scripture_snapshots_insert ON public.scripture_snapshots;

CREATE POLICY scripture_snapshots_insert ON public.scripture_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    prayer_id IS NOT NULL
    AND public.is_prayer_creator(prayer_id, auth.uid())
  );

DROP POLICY IF EXISTS scripture_snapshots_update ON public.scripture_snapshots;

CREATE POLICY scripture_snapshots_update ON public.scripture_snapshots
  FOR UPDATE TO authenticated
  USING (
    prayer_id IS NOT NULL
    AND public.is_prayer_creator(prayer_id, auth.uid())
  )
  WITH CHECK (
    prayer_id IS NOT NULL
    AND public.is_prayer_creator(prayer_id, auth.uid())
  );

GRANT EXECUTE ON FUNCTION public.is_prayer_creator(UUID, UUID) TO authenticated;
