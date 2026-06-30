-- Beta access: only waitlist emails can create new accounts during private beta

CREATE OR REPLACE FUNCTION public.is_on_beta_waitlist(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.beta_waitlist
    WHERE lower(trim(email)) = lower(trim(check_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_on_beta_waitlist(TEXT) TO anon, authenticated;
