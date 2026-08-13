-- Group invite links: pending invites for invitee, token accept, optional require_code

ALTER TABLE public.group_invites
  ADD COLUMN IF NOT EXISTS require_code BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.group_invites.require_code IS
  'If true, invitee must enter the group invite code. If false, the invite link/token alone joins them.';

-- Invitees can see their pending invites with group name (they are not members yet).
CREATE OR REPLACE FUNCTION public.list_my_pending_group_invites()
RETURNS TABLE (
  invite_id UUID,
  group_id UUID,
  group_name TEXT,
  invite_code TEXT,
  token TEXT,
  require_code BOOLEAN,
  email TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    gi.id AS invite_id,
    gi.group_id,
    pg.name AS group_name,
    pg.invite_code,
    gi.token,
    gi.require_code,
    gi.email,
    gi.expires_at,
    gi.created_at
  FROM public.group_invites gi
  INNER JOIN public.prayer_groups pg ON pg.id = gi.group_id
  WHERE lower(gi.email) = v_email
    AND gi.status = 'pending'
    AND gi.expires_at > NOW()
    AND pg.is_active = TRUE
  ORDER BY gi.created_at DESC;
END;
$$;

-- Join via invite token (link-only invites). Email on account must match invite.
CREATE OR REPLACE FUNCTION public.accept_group_invite_by_token(p_token TEXT)
RETURNS public.prayer_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_invite public.group_invites;
  v_group public.prayer_groups;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Your account has no email address.';
  END IF;

  SELECT * INTO v_invite
  FROM public.group_invites
  WHERE token = trim(p_token)
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite link.';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite is no longer available.';
  END IF;

  IF v_invite.expires_at <= NOW() THEN
    UPDATE public.group_invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'This invite has expired. Ask for a new invite.';
  END IF;

  IF lower(v_invite.email) <> v_email THEN
    RAISE EXCEPTION 'This invite was sent to a different email. Sign in with % to accept it.', v_invite.email;
  END IF;

  IF v_invite.require_code THEN
    RAISE EXCEPTION 'This invite requires the group invite code. Use Join with code.';
  END IF;

  SELECT * INTO v_group
  FROM public.prayer_groups
  WHERE id = v_invite.group_id
    AND is_active = TRUE;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'This group is no longer active.';
  END IF;

  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group.id, v_user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE public.group_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN v_group;
END;
$$;

-- When joining by code, mark matching pending email invites as accepted.
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS public.prayer_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_group public.prayer_groups;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_user_id;

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

  IF v_email IS NOT NULL AND v_email <> '' THEN
    UPDATE public.group_invites
    SET status = 'accepted'
    WHERE group_id = v_group.id
      AND lower(email) = v_email
      AND status = 'pending';
  END IF;

  RETURN v_group;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_pending_group_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_group_invite_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(TEXT) TO authenticated;
