/**
 * Central plan + feature catalog for PrayerCare freemium.
 * Keep feature checks here — never scatter plan logic across screens.
 */

export const SUBSCRIPTION_TIERS = ['free', 'plus', 'ministry', 'church'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'unpaid',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_PROVIDERS = ['manual', 'beta', 'stripe'] as const;
export type SubscriptionProvider = (typeof SUBSCRIPTION_PROVIDERS)[number];

/** Highest tier — used for private beta full unlock. */
export const BETA_FULL_ACCESS_TIER: SubscriptionTier = 'church';

/** Default tier for new users after public launch (change when leaving beta). */
export const PUBLIC_DEFAULT_TIER: SubscriptionTier = 'free';

export const FEATURE_KEYS = [
  'personal_prayer_journal',
  'ai_prayer_generation',
  'ai_verse_suggestions',
  'prayer_reminders',
  'recurring_prayers',
  'today_prayer_list',
  'prayer_history',
  'calendar_history',
  'praise_reports',
  'sermon_notes',
  'bible_meditation_notes',
  'prayer_groups',
  'advanced_search',
  'export_journal',
  'care_actions',
  'prayer_analytics',
  'care_analytics',
  'follow_up_tracking',
  'ministry_reporting',
  'group_permissions',
  'unlimited_members',
  'multiple_ministry_groups',
  'shared_prayer_lists',
  'unlimited_ministries',
  'church_dashboard',
  'leadership_analytics',
  'church_reporting',
  'ministry_dashboards',
  'exportable_reports',
  'integrations',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureEntitlement = {
  enabled: boolean;
  /** null = unlimited; number = hard cap (e.g. monthly AI uses, max groups) */
  limit: number | null;
};

export type PlanDefinition = {
  id: SubscriptionTier;
  name: string;
  description: string;
  features: Record<FeatureKey, FeatureEntitlement>;
};

function allEnabled(overrides: Partial<Record<FeatureKey, FeatureEntitlement>> = {}): Record<
  FeatureKey,
  FeatureEntitlement
> {
  const base = Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, { enabled: true, limit: null }]),
  ) as Record<FeatureKey, FeatureEntitlement>;
  return { ...base, ...overrides };
}

function freeDefaults(): Record<FeatureKey, FeatureEntitlement> {
  const denied = Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, { enabled: false, limit: null }]),
  ) as Record<FeatureKey, FeatureEntitlement>;

  return {
    ...denied,
    personal_prayer_journal: { enabled: true, limit: null },
    ai_prayer_generation: { enabled: true, limit: 10 },
    ai_verse_suggestions: { enabled: true, limit: 20 },
    prayer_reminders: { enabled: true, limit: null },
    recurring_prayers: { enabled: true, limit: null },
    today_prayer_list: { enabled: true, limit: null },
    prayer_history: { enabled: true, limit: null },
    calendar_history: { enabled: true, limit: null },
    praise_reports: { enabled: true, limit: null },
    sermon_notes: { enabled: true, limit: null },
    bible_meditation_notes: { enabled: true, limit: null },
    prayer_groups: { enabled: true, limit: 1 },
  };
}

export const PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Designed for every Christian.',
    features: freeDefaults(),
  },
  plus: {
    id: 'plus',
    name: 'PrayerCare Plus',
    description: 'For individuals who want advanced features.',
    features: allEnabled({
      care_actions: { enabled: false, limit: null },
      prayer_analytics: { enabled: false, limit: null },
      care_analytics: { enabled: false, limit: null },
      follow_up_tracking: { enabled: false, limit: null },
      ministry_reporting: { enabled: false, limit: null },
      group_permissions: { enabled: false, limit: null },
      unlimited_members: { enabled: false, limit: null },
      multiple_ministry_groups: { enabled: false, limit: null },
      shared_prayer_lists: { enabled: false, limit: null },
      unlimited_ministries: { enabled: false, limit: null },
      church_dashboard: { enabled: false, limit: null },
      leadership_analytics: { enabled: false, limit: null },
      church_reporting: { enabled: false, limit: null },
      ministry_dashboards: { enabled: false, limit: null },
      exportable_reports: { enabled: false, limit: null },
      integrations: { enabled: false, limit: null },
    }),
  },
  ministry: {
    id: 'ministry',
    name: 'Ministry',
    description: 'For ministries and small churches.',
    features: allEnabled({
      unlimited_ministries: { enabled: false, limit: null },
      church_dashboard: { enabled: false, limit: null },
      leadership_analytics: { enabled: false, limit: null },
      church_reporting: { enabled: false, limit: null },
      integrations: { enabled: false, limit: null },
    }),
  },
  church: {
    id: 'church',
    name: 'Church',
    description: 'For larger churches.',
    features: allEnabled(),
  },
};

export function isSubscriptionTier(value: unknown): value is SubscriptionTier {
  return typeof value === 'string' && (SUBSCRIPTION_TIERS as readonly string[]).includes(value);
}

export function tierRank(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS.indexOf(tier);
}

export function hasTierAccess(userTier: SubscriptionTier, required: SubscriptionTier): boolean {
  return tierRank(userTier) >= tierRank(required);
}
