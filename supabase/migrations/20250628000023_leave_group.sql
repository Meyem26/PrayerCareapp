-- Allow members to leave a group reliably (SECURITY DEFINER; avoids silent RLS no-ops).

CREATE OR REPLACE FUNCTION public.leave_prayer_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role public.group_member_role;
  v_other_admins INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role
  FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  -- Sole admin/leader should transfer ownership or delete the group first.
  IF v_role IN ('admin', 'leader') THEN
    SELECT COUNT(*)::INT INTO v_other_admins
    FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id <> v_user_id
      AND role IN ('admin', 'leader');

    IF v_other_admins = 0 THEN
      RAISE EXCEPTION
        'You are the only leader of this group. Promote another member first, or delete the group.';
    END IF;
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_prayer_group(UUID) TO authenticated;
