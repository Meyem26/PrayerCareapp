-- Public beta waitlist (website signup form)

CREATE TABLE public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT beta_waitlist_email_unique UNIQUE (email)
);

CREATE INDEX beta_waitlist_created_at_idx ON public.beta_waitlist (created_at DESC);

ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY;

-- Website visitors can sign up (uses public anon key + RLS)
CREATE POLICY beta_waitlist_insert ON public.beta_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(trim(email)) > 3
    AND email ~* '^[^@]+@[^@]+\.[^@]+$'
  );

-- No public reads — view signups in Supabase Dashboard (service role)
CREATE POLICY beta_waitlist_deny_select ON public.beta_waitlist
  FOR SELECT TO anon, authenticated
  USING (false);

GRANT INSERT ON public.beta_waitlist TO anon, authenticated;
