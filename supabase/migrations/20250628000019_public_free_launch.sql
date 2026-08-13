-- Public free launch: no paywall. New users are labeled free/manual.
-- Feature limits stay OFF in the app (EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED=false),
-- so every user still has full product access until freemium is intentionally enabled later.

-- Defaults for new profile / subscription rows
ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'free';

COMMENT ON COLUMN public.profiles.subscription_tier IS
  'Effective plan label for freemium. Public launch default is free; app enforcement is off so all features remain available.';

ALTER TABLE public.subscriptions
  ALTER COLUMN tier SET DEFAULT 'free';

ALTER TABLE public.subscriptions
  ALTER COLUMN provider SET DEFAULT 'manual';

-- New signups: free plan row (not church/beta)
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
    'free'
  );

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);

  INSERT INTO public.subscriptions (user_id, tier, status, provider, metadata)
  VALUES (
    NEW.id,
    'free',
    'active',
    'manual',
    jsonb_build_object('reason', 'public_free_launch')
  );

  RETURN NEW;
END;
$$;

-- Existing beta users: keep full access via app (enforcement off).
-- Relabel profiles/subscriptions to free/manual for honest public-launch accounting.
UPDATE public.profiles
SET subscription_tier = 'free'
WHERE subscription_tier IS DISTINCT FROM 'free';

UPDATE public.subscriptions
SET
  status = 'canceled',
  canceled_at = COALESCE(canceled_at, NOW()),
  updated_at = NOW(),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'ended', 'public_free_launch',
    'previous_tier', tier::text
  )
WHERE provider = 'beta'
  AND status IN ('trialing', 'active', 'past_due');

INSERT INTO public.subscriptions (user_id, tier, status, provider, metadata)
SELECT
  p.id,
  'free',
  'active',
  'manual',
  jsonb_build_object('reason', 'public_free_launch', 'migrated_from', 'beta')
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscriptions s
  WHERE s.user_id = p.id
    AND s.status IN ('trialing', 'active', 'past_due')
);
