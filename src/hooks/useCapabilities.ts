import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import type { CapabilityKey, CapabilityProfile } from '../types/capabilities';
import type { SubscriptionTier } from '../types/subscription';
import { SUBSCRIPTION_PLANS } from '../types/subscription';

const FEATURE_MIN_TIER: Record<CapabilityKey, SubscriptionTier> = {
  styleMemory: 'pro',
  characterManagement: 'pro',
  knowledgeBase: 'unlimited',
  aiAssistant: 'free', // 修改为free，允许所有用户访问
  versionHistory: 'pro',
  collaboration: 'unlimited',
  analytics: 'pro',
  templateLibrary: 'starter'
};

export function useCapabilities() {
  const subscription = useSubscription();
  const tier = subscription.tier ?? 'free';
  const plan =
    (subscription.plan &&
      subscription.plan.limits &&
      subscription.plan.features &&
      subscription.plan.features.exportFormats &&
      subscription.plan.features.exportFormats.length > 0 &&
      subscription.plan) ||
    SUBSCRIPTION_PLANS[tier] ||
    SUBSCRIPTION_PLANS.free;
  const safeLimits = plan?.limits ?? SUBSCRIPTION_PLANS.free.limits;
  const safeFeatures = plan?.features ?? SUBSCRIPTION_PLANS.free.features;

  const profile: CapabilityProfile = useMemo(
    () => {
      // Check feature access based on FEATURE_MIN_TIER, not plan.features
      // This ensures consistency even if SUBSCRIPTION_PLANS is misconfigured
      const tierIndex = ['free', 'starter', 'pro', 'unlimited'].indexOf(tier);
      
      const checkFeature = (featureKey: CapabilityKey): boolean => {
        const requiredTier = FEATURE_MIN_TIER[featureKey];
        const requiredTierIndex = ['free', 'starter', 'pro', 'unlimited'].indexOf(requiredTier);
        return tierIndex >= requiredTierIndex;
      };

      return {
        tier: subscription.tier,
        limits: {
          generationsPerMonth: safeLimits.maxGenerationsPerMonth,
          maxPages: safeLimits.maxNovelLength
        },
        exportFormats: safeFeatures.exportFormats,
        features: {
          styleMemory: checkFeature('styleMemory'),
          characterManagement: checkFeature('characterManagement'),
          knowledgeBase: checkFeature('knowledgeBase'),
          aiAssistant: checkFeature('aiAssistant'),
          versionHistory: checkFeature('versionHistory'),
          collaboration: checkFeature('collaboration'),
          analytics: checkFeature('analytics'),
          templateLibrary: checkFeature('templateLibrary')
        }
      };
    },
    [safeFeatures, safeLimits, subscription.tier, tier]
  );

  const hasFeature = (feature: CapabilityKey) => Boolean(profile.features[feature]);

  const getRequiredTier = (feature: CapabilityKey): SubscriptionTier => FEATURE_MIN_TIER[feature];

  return {
    profile,
    hasFeature,
    getRequiredTier,
    tier: profile.tier
  };
}

