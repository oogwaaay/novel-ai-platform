import { useMemo } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import type { SubscriptionTier, SubscriptionPlan } from '../types/subscription';

export function useSubscription() {
  const {
    subscription,
    setSubscription,
    incrementUsage,
    resetMonthlyUsage,
    canUseFeature,
    canGenerate,
    getRemainingGenerations
  } = useSubscriptionStore();

  const plan = useMemo(
    () => subscription.plan ?? SUBSCRIPTION_PLANS[subscription.tier],
    [subscription.plan, subscription.tier]
  );

  return {
    subscription: {
      ...subscription,
      plan
    },
    tier: subscription.tier,
    plan,
    usage: subscription.usage,
    setSubscription,
    incrementUsage,
    resetMonthlyUsage,
    canUseFeature,
    canGenerate,
    getRemainingGenerations,
    isFree: subscription.tier === 'free',
    isStarter: subscription.tier === 'starter',
    isPro: subscription.tier === 'pro',
    isUnlimited: subscription.tier === 'unlimited'
  };
}

export function useFeatureAccess(feature: keyof SubscriptionPlan['features']) {
  const { canUseFeature, tier } = useSubscription();
  return {
    hasAccess: canUseFeature(feature),
    currentTier: tier
  };
}

