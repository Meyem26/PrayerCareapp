import { BETA_MODE } from '@/constants/beta';
import {
  BETA_FULL_ACCESS_TIER,
  PLANS,
  type FeatureEntitlement,
  type FeatureKey,
  type SubscriptionTier,
  isSubscriptionTier,
} from '@/lib/subscriptions/plans';

/**
 * When false, plan limits are ignored and everyone has full access.
 * Private beta keeps this false via BETA_MODE. Set EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED=true
 * at public launch (and set BETA_MODE false) to turn restrictions on.
 */
export const SUBSCRIPTIONS_ENFORCED =
  !BETA_MODE && process.env.EXPO_PUBLIC_SUBSCRIPTIONS_ENFORCED === 'true';

export type EntitlementResult = FeatureEntitlement & {
  feature: FeatureKey;
  tier: SubscriptionTier;
  enforced: boolean;
};

export function resolveSubscriptionTier(
  tier: string | null | undefined,
): SubscriptionTier {
  if (isSubscriptionTier(tier)) return tier;
  return BETA_MODE ? BETA_FULL_ACCESS_TIER : 'free';
}

export function getEffectiveTier(
  profileTier: string | null | undefined,
): SubscriptionTier {
  if (!SUBSCRIPTIONS_ENFORCED) {
    return BETA_FULL_ACCESS_TIER;
  }
  return resolveSubscriptionTier(profileTier);
}

export function getFeatureEntitlement(
  feature: FeatureKey,
  profileTier: string | null | undefined,
): EntitlementResult {
  const tier = getEffectiveTier(profileTier);
  const entitlement = PLANS[tier].features[feature] ?? { enabled: false, limit: null };

  if (!SUBSCRIPTIONS_ENFORCED) {
    return {
      feature,
      tier,
      enabled: true,
      limit: null,
      enforced: false,
    };
  }

  return {
    feature,
    tier,
    enabled: entitlement.enabled,
    limit: entitlement.limit,
    enforced: true,
  };
}

export function canAccessFeature(
  feature: FeatureKey,
  profileTier: string | null | undefined,
): boolean {
  return getFeatureEntitlement(feature, profileTier).enabled;
}

export function getFeatureLimit(
  feature: FeatureKey,
  profileTier: string | null | undefined,
): number | null {
  return getFeatureEntitlement(feature, profileTier).limit;
}

/** Returns true when usage is under the plan limit (or unlimited / not enforced). */
export function isWithinLimit(
  feature: FeatureKey,
  profileTier: string | null | undefined,
  currentUsage: number,
): boolean {
  const { enabled, limit } = getFeatureEntitlement(feature, profileTier);
  if (!enabled) return false;
  if (limit == null) return true;
  return currentUsage < limit;
}

export function remainingAllowance(
  feature: FeatureKey,
  profileTier: string | null | undefined,
  currentUsage: number,
): number | null {
  const { enabled, limit } = getFeatureEntitlement(feature, profileTier);
  if (!enabled) return 0;
  if (limit == null) return null;
  return Math.max(0, limit - currentUsage);
}
