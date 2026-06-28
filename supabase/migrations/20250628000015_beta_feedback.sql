-- Private beta feedback from testers

CREATE TABLE public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  feedback_text TEXT,
  most_valuable_feature TEXT,
  most_frustrating TEXT,
  app_version TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX beta_feedback_user_id_idx ON public.beta_feedback (user_id);
CREATE INDEX beta_feedback_created_at_idx ON public.beta_feedback (created_at DESC);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY beta_feedback_insert_own ON public.beta_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY beta_feedback_select_own ON public.beta_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
