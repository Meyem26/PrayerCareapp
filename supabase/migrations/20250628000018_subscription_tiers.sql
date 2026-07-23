-- PrayerCare freemium foundation (no payments yet)
-- Plans: free → plus → ministry → church
-- Private beta: assign highest tier (church) to every user; enforce limits only after launch.

CREATE TYPE public.subscription_tier AS ENUM (
  'free',
  'plus',
  'ministry',
  'church'
);

CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'unpaid'
);

CREATE TYPE public.subscription_provider AS ENUM (
  'manual',
  'beta',
  'stripe'
);

-- Fast client reads: denormalized current tier on the profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'church';

COMMENT ON COLUMN public.profiles.subscription_tier IS
  'Effective plan for feature access. During private beta default is church (full access). Change default to free at public launch.';

-- Billing-ready subscription records (Stripe fields nullable until payments are enabled)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL DEFAULT 'church',
  status public.subscription_status NOT NULL DEFAULT 'active',
  provider public.subscription_provider NOT NULL DEFAULT 'beta',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  provider_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_provider_sub_unique UNIQUE (provider, provider_subscription_id)
);

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions (user_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX subscriptions_provider_customer_idx
  ON public.subscriptions (provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

-- One active-ish subscription per user (manual/beta/stripe)
CREATE UNIQUE INDEX subscriptions_one_active_per_user_idx
  ON public.subscriptions (user_id)
  WHERE status IN ('trialing', 'active', 'past_due');

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Plan feature catalog (limits: NULL = unlimited, number = cap)
CREATE TABLE public.plan_entitlements (
  tier public.subscription_tier NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value INTEGER,
  notes TEXT,
  PRIMARY KEY (tier, feature_key),
  CONSTRAINT plan_entitlements_limit_nonneg CHECK (limit_value IS NULL OR limit_value >= 0)
);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_entitlements_select_authenticated ON public.plan_entitlements
  FOR SELECT TO authenticated
  USING (true);

-- Seed entitlements for all four tiers
INSERT INTO public.plan_entitlements (tier, feature_key, enabled, limit_value, notes) VALUES
  -- Free
  ('free', 'personal_prayer_journal', true, NULL, NULL),
  ('free', 'ai_prayer_generation', true, 10, 'Monthly AI prayer generations'),
  ('free', 'ai_verse_suggestions', true, 20, 'Monthly AI verse suggestions'),
  ('free', 'prayer_reminders', true, NULL, NULL),
  ('free', 'recurring_prayers', true, NULL, NULL),
  ('free', 'today_prayer_list', true, NULL, NULL),
  ('free', 'prayer_history', true, NULL, NULL),
  ('free', 'calendar_history', true, NULL, NULL),
  ('free', 'praise_reports', true, NULL, NULL),
  ('free', 'sermon_notes', true, NULL, NULL),
  ('free', 'bible_meditation_notes', true, NULL, NULL),
  ('free', 'prayer_groups', true, 1, 'Max prayer groups the user may create/own'),
  ('free', 'advanced_search', false, NULL, NULL),
  ('free', 'export_journal', false, NULL, NULL),
  ('free', 'care_actions', false, NULL, NULL),
  ('free', 'prayer_analytics', false, NULL, NULL),
  ('free', 'care_analytics', false, NULL, NULL),
  ('free', 'follow_up_tracking', false, NULL, NULL),
  ('free', 'ministry_reporting', false, NULL, NULL),
  ('free', 'group_permissions', false, NULL, NULL),
  ('free', 'unlimited_members', false, NULL, NULL),
  ('free', 'multiple_ministry_groups', false, NULL, NULL),
  ('free', 'shared_prayer_lists', false, NULL, NULL),
  ('free', 'unlimited_ministries', false, NULL, NULL),
  ('free', 'church_dashboard', false, NULL, NULL),
  ('free', 'leadership_analytics', false, NULL, NULL),
  ('free', 'church_reporting', false, NULL, NULL),
  ('free', 'ministry_dashboards', false, NULL, NULL),
  ('free', 'exportable_reports', false, NULL, NULL),
  ('free', 'integrations', false, NULL, NULL),

  -- Plus
  ('plus', 'personal_prayer_journal', true, NULL, NULL),
  ('plus', 'ai_prayer_generation', true, NULL, 'Unlimited'),
  ('plus', 'ai_verse_suggestions', true, NULL, 'Unlimited'),
  ('plus', 'prayer_reminders', true, NULL, NULL),
  ('plus', 'recurring_prayers', true, NULL, NULL),
  ('plus', 'today_prayer_list', true, NULL, NULL),
  ('plus', 'prayer_history', true, NULL, NULL),
  ('plus', 'calendar_history', true, NULL, NULL),
  ('plus', 'praise_reports', true, NULL, NULL),
  ('plus', 'sermon_notes', true, NULL, NULL),
  ('plus', 'bible_meditation_notes', true, NULL, NULL),
  ('plus', 'prayer_groups', true, NULL, 'Multiple groups'),
  ('plus', 'advanced_search', true, NULL, NULL),
  ('plus', 'export_journal', true, NULL, NULL),
  ('plus', 'care_actions', false, NULL, NULL),
  ('plus', 'prayer_analytics', false, NULL, NULL),
  ('plus', 'care_analytics', false, NULL, NULL),
  ('plus', 'follow_up_tracking', false, NULL, NULL),
  ('plus', 'ministry_reporting', false, NULL, NULL),
  ('plus', 'group_permissions', false, NULL, NULL),
  ('plus', 'unlimited_members', false, NULL, NULL),
  ('plus', 'multiple_ministry_groups', false, NULL, NULL),
  ('plus', 'shared_prayer_lists', false, NULL, NULL),
  ('plus', 'unlimited_ministries', false, NULL, NULL),
  ('plus', 'church_dashboard', false, NULL, NULL),
  ('plus', 'leadership_analytics', false, NULL, NULL),
  ('plus', 'church_reporting', false, NULL, NULL),
  ('plus', 'ministry_dashboards', false, NULL, NULL),
  ('plus', 'exportable_reports', false, NULL, NULL),
  ('plus', 'integrations', false, NULL, NULL),

  -- Ministry
  ('ministry', 'personal_prayer_journal', true, NULL, NULL),
  ('ministry', 'ai_prayer_generation', true, NULL, NULL),
  ('ministry', 'ai_verse_suggestions', true, NULL, NULL),
  ('ministry', 'prayer_reminders', true, NULL, NULL),
  ('ministry', 'recurring_prayers', true, NULL, NULL),
  ('ministry', 'today_prayer_list', true, NULL, NULL),
  ('ministry', 'prayer_history', true, NULL, NULL),
  ('ministry', 'calendar_history', true, NULL, NULL),
  ('ministry', 'praise_reports', true, NULL, NULL),
  ('ministry', 'sermon_notes', true, NULL, NULL),
  ('ministry', 'bible_meditation_notes', true, NULL, NULL),
  ('ministry', 'prayer_groups', true, NULL, NULL),
  ('ministry', 'advanced_search', true, NULL, NULL),
  ('ministry', 'export_journal', true, NULL, NULL),
  ('ministry', 'care_actions', true, NULL, NULL),
  ('ministry', 'prayer_analytics', true, NULL, NULL),
  ('ministry', 'care_analytics', true, NULL, NULL),
  ('ministry', 'follow_up_tracking', true, NULL, NULL),
  ('ministry', 'ministry_reporting', true, NULL, NULL),
  ('ministry', 'group_permissions', true, NULL, NULL),
  ('ministry', 'unlimited_members', true, NULL, NULL),
  ('ministry', 'multiple_ministry_groups', true, NULL, NULL),
  ('ministry', 'shared_prayer_lists', true, NULL, NULL),
  ('ministry', 'unlimited_ministries', false, NULL, NULL),
  ('ministry', 'church_dashboard', false, NULL, NULL),
  ('ministry', 'leadership_analytics', false, NULL, NULL),
  ('ministry', 'church_reporting', false, NULL, NULL),
  ('ministry', 'ministry_dashboards', true, NULL, NULL),
  ('ministry', 'exportable_reports', true, NULL, NULL),
  ('ministry', 'integrations', false, NULL, NULL),

  -- Church (full access)
  ('church', 'personal_prayer_journal', true, NULL, NULL),
  ('church', 'ai_prayer_generation', true, NULL, NULL),
  ('church', 'ai_verse_suggestions', true, NULL, NULL),
  ('church', 'prayer_reminders', true, NULL, NULL),
  ('church', 'recurring_prayers', true, NULL, NULL),
  ('church', 'today_prayer_list', true, NULL, NULL),
  ('church', 'prayer_history', true, NULL, NULL),
  ('church', 'calendar_history', true, NULL, NULL),
  ('church', 'praise_reports', true, NULL, NULL),
  ('church', 'sermon_notes', true, NULL, NULL),
  ('church', 'bible_meditation_notes', true, NULL, NULL),
  ('church', 'prayer_groups', true, NULL, NULL),
  ('church', 'advanced_search', true, NULL, NULL),
  ('church', 'export_journal', true, NULL, NULL),
  ('church', 'care_actions', true, NULL, NULL),
  ('church', 'prayer_analytics', true, NULL, NULL),
  ('church', 'care_analytics', true, NULL, NULL),
  ('church', 'follow_up_tracking', true, NULL, NULL),
  ('church', 'ministry_reporting', true, NULL, NULL),
  ('church', 'group_permissions', true, NULL, NULL),
  ('church', 'unlimited_members', true, NULL, NULL),
  ('church', 'multiple_ministry_groups', true, NULL, NULL),
  ('church', 'shared_prayer_lists', true, NULL, NULL),
  ('church', 'unlimited_ministries', true, NULL, NULL),
  ('church', 'church_dashboard', true, NULL, NULL),
  ('church', 'leadership_analytics', true, NULL, NULL),
  ('church', 'church_reporting', true, NULL, NULL),
  ('church', 'ministry_dashboards', true, NULL, NULL),
  ('church', 'exportable_reports', true, NULL, NULL),
  ('church', 'integrations', true, NULL, NULL)
ON CONFLICT (tier, feature_key) DO UPDATE
SET
  enabled = EXCLUDED.enabled,
  limit_value = EXCLUDED.limit_value,
  notes = EXCLUDED.notes;

-- Backfill existing users to full beta access
UPDATE public.profiles
SET subscription_tier = 'church'
WHERE subscription_tier IS DISTINCT FROM 'church';

INSERT INTO public.subscriptions (user_id, tier, status, provider, metadata)
SELECT
  p.id,
  'church',
  'active',
  'beta',
  jsonb_build_object('reason', 'private_beta_full_access')
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscriptions s
  WHERE s.user_id = p.id
    AND s.status IN ('trialing', 'active', 'past_due')
);

-- New users: full access during private beta + beta subscription row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    'church'
  );

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);

  INSERT INTO public.subscriptions (user_id, tier, status, provider, metadata)
  VALUES (
    NEW.id,
    'church',
    'active',
    'beta',
    jsonb_build_object('reason', 'private_beta_full_access')
  );

  RETURN NEW;
END;
$$;

-- Helpers for server-side / RPC checks later
CREATE OR REPLACE FUNCTION public.user_subscription_tier(p_user_id UUID DEFAULT auth.uid())
RETURNS public.subscription_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT s.tier
      FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND s.status IN ('trialing', 'active')
      ORDER BY s.updated_at DESC
      LIMIT 1
    ),
    (SELECT pr.subscription_tier FROM public.profiles pr WHERE pr.id = p_user_id),
    'free'::public.subscription_tier
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_feature(
  p_feature_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pe.enabled
      FROM public.plan_entitlements pe
      WHERE pe.tier = public.user_subscription_tier(p_user_id)
        AND pe.feature_key = p_feature_key
    ),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.user_feature_limit(
  p_feature_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pe.limit_value
  FROM public.plan_entitlements pe
  WHERE pe.tier = public.user_subscription_tier(p_user_id)
    AND pe.feature_key = p_feature_key;
$$;

GRANT EXECUTE ON FUNCTION public.user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_feature(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_feature_limit(TEXT, UUID) TO authenticated;
