-- Fix group creation RLS (same pattern as create_personal_prayer)

CREATE OR REPLACE FUNCTION public.create_prayer_group(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
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
    RAISE EXCEPTION 'Not authenticated. Please sign out and sign in again.';
  END IF;

  IF char_length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Group name is required.';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.prayer_groups (name, description, created_by)
  VALUES (trim(p_name), NULLIF(trim(p_description), ''), v_user_id)
  RETURNING * INTO v_group;

  -- Trigger on_prayer_group_created adds creator as admin

  RETURN v_group;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_prayer_group(TEXT, TEXT) TO authenticated;

-- Creator can always read their group (helps insert return + edge cases)
DROP POLICY IF EXISTS prayer_groups_select_creator ON public.prayer_groups;

CREATE POLICY prayer_groups_select_creator ON public.prayer_groups
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());
