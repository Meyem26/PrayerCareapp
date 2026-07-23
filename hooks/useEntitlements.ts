import { useMemo } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  SUBSCRIPTIONS_ENFORCED,
  canAccessFeature,
  getEffectiveTier,
  getFeatureEntitlement,
  getFeatureLimit,
  isWithinLimit,
  type FeatureKey,
  type SubscriptionTier,
} from '@/lib/subscriptions';

/**
 * Central hook for freemium checks. Prefer this over reading profile.subscription_tier directly.
 */
export function useEntitlements() {
  const { profile } = useAuth();
  const tier = getEffectiveTier(profile?.subscription_tier);

  return useMemo(
    () => ({
      tier,
      enforced: SUBSCRIPTIONS_ENFORCED,
      canAccess: (feature: FeatureKey) => canAccessFeature(feature, profile?.subscription_tier),
      getLimit: (feature: FeatureKey) => getFeatureLimit(feature, profile?.subscription_tier),
      entitlement: (feature: FeatureKey) =>
        getFeatureEntitlement(feature, profile?.subscription_tier),
      withinLimit: (feature: FeatureKey, currentUsage: number) =>
        isWithinLimit(feature, profile?.subscription_tier, currentUsage),
      isPlusOrHigher: (['plus', 'ministry', 'church'] as SubscriptionTier[]).includes(tier),
      isMinistryOrHigher: (['ministry', 'church'] as SubscriptionTier[]).includes(tier),
      isChurch: tier === 'church',
    }),
    [profile?.subscription_tier, tier],
  );
}
