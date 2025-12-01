import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  SubscriptionTier,
  UserSubscription,
  SubscriptionPlan,
  SubscriptionFeatureFlags,
  SubscriptionLimits,
  UsageStats
} from '../types/subscription';
import { SUBSCRIPTION_PLANS } from '../types/subscription';

export interface BackendSubscriptionPayload {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  trialEndsAt?: number;
  limits?: Partial<SubscriptionLimits>;
  features?: Partial<SubscriptionFeatureFlags>;
}

export interface BackendUsagePayload {
  monthKey?: string;
  generationsUsed?: number;
  pagesUsed?: number;
  tokensUsed?: number;
  lastResetAt?: number;
}

interface SubscriptionState {
  subscription: UserSubscription;
  setSubscription: (tier: SubscriptionTier) => void;
  applyRemoteSubscription: (payload: BackendSubscriptionPayload, usage: BackendUsagePayload) => void;
  reset: () => void;
  incrementUsage: () => void;
  resetMonthlyUsage: () => void;
  canUseFeature: (feature: keyof SubscriptionPlan['features']) => boolean;
  canGenerate: (requestedLength: number) => boolean;
  getRemainingGenerations: () => number;
}

const getDefaultSubscription = (): UserSubscription => {
  const tier: SubscriptionTier = 'free';
  const plan = SUBSCRIPTION_PLANS[tier];

  return {
    tier,
    plan,
    usage: {
      generationsThisMonth: 0,
      lastResetDate: Date.now(),
      totalGenerations: 0,
      monthKey: '',
      pagesUsed: 0,
      tokensUsed: 0
    },
    billingCycle: 'monthly',
    status: 'trialing',
    trialEndsAt: undefined,
    isActive: true
  };
};

const ensurePlan = (subscription: UserSubscription): SubscriptionPlan =>
  subscription.plan ?? SUBSCRIPTION_PLANS[subscription.tier];

const mergePlanWithRemote = (
  tier: SubscriptionTier,
  overrides?: {
    limits?: Partial<SubscriptionLimits>;
    features?: Partial<SubscriptionFeatureFlags>;
  }
): SubscriptionPlan => {
  const basePlan = SUBSCRIPTION_PLANS[tier];
  return {
    ...basePlan,
    limits: {
      ...basePlan.limits,
      ...(overrides?.limits || {})
    },
    features: {
      ...basePlan.features,
      ...(overrides?.features || {}),
      exportFormats:
        overrides?.features?.exportFormats && overrides.features.exportFormats.length > 0
          ? overrides.features.exportFormats
          : basePlan.features.exportFormats
    }
  };
};

const mapUsage = (existing: UsageStats, payload?: BackendUsagePayload): UsageStats => {
  if (!payload) return existing;
  return {
    generationsThisMonth:
      payload.generationsUsed ?? existing.generationsThisMonth ?? 0,
    totalGenerations:
      payload.generationsUsed ?? existing.totalGenerations ?? 0,
    lastResetDate: payload.lastResetAt ?? existing.lastResetDate ?? Date.now(),
    monthKey: payload.monthKey ?? existing.monthKey,
    pagesUsed: payload.pagesUsed ?? existing.pagesUsed ?? 0,
    tokensUsed: payload.tokensUsed ?? existing.tokensUsed ?? 0
  };
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscription: getDefaultSubscription(),

      setSubscription: (tier: SubscriptionTier) => {
        const plan = SUBSCRIPTION_PLANS[tier];
        set((state) => ({
          subscription: {
            ...state.subscription,
            tier,
            plan,
            billingCycle: state.subscription.billingCycle,
            status: state.subscription.status,
            isActive: true
          }
        }));
      },

      applyRemoteSubscription: (subscriptionPayload, usagePayload) => {
        const plan = mergePlanWithRemote(subscriptionPayload.tier, {
          limits: subscriptionPayload.limits,
          features: subscriptionPayload.features
        });
        set((state) => ({
          subscription: {
            tier: subscriptionPayload.tier,
            plan,
            usage: mapUsage(state.subscription.usage, usagePayload),
            billingCycle: subscriptionPayload.billingCycle,
            status: subscriptionPayload.status,
            trialEndsAt: subscriptionPayload.trialEndsAt,
            isActive: subscriptionPayload.status === 'active' || subscriptionPayload.status === 'trialing'
          }
        }));
      },

      reset: () => {
        set({
          subscription: getDefaultSubscription()
        });
      },

      incrementUsage: () => {
        set((state) => {
          const now = Date.now();
          const lastReset = state.subscription.usage.lastResetDate;
          
          // Check if we've crossed into a new month (matching backend logic)
          const lastResetDate = new Date(lastReset);
          const currentDate = new Date(now);
          const isNewMonth = lastResetDate.getMonth() !== currentDate.getMonth() || 
                            lastResetDate.getFullYear() !== currentDate.getFullYear();
          
          // Reset monthly usage if we've crossed into a new month
          let usage = { ...state.subscription.usage };
          if (isNewMonth) {
            usage = {
              ...usage,
              generationsThisMonth: 0,
              lastResetDate: now
            };
          }

          return {
            subscription: {
              ...state.subscription,
              usage: {
                ...usage,
                generationsThisMonth: usage.generationsThisMonth + 1,
                totalGenerations: usage.totalGenerations + 1
              }
            }
          };
        });
      },

      resetMonthlyUsage: () => {
        set((state) => ({
          subscription: {
            ...state.subscription,
            usage: {
              ...state.subscription.usage,
              generationsThisMonth: 0,
              lastResetDate: Date.now()
            }
          }
        }));
      },

      canUseFeature: (feature: keyof SubscriptionPlan['features']) => {
        const { subscription } = get();
        const featureValue = ensurePlan(subscription).features[feature];
        
        if (typeof featureValue === 'boolean') {
          return featureValue;
        }
        if (Array.isArray(featureValue)) {
          return featureValue.length > 0;
        }
        return true;
      },

      canGenerate: (requestedLength: number) => {
        const { subscription } = get();
        const { maxGenerationsPerMonth, maxNovelLength } = ensurePlan(subscription).limits;
        
        // Check monthly limit
        if (maxGenerationsPerMonth !== Infinity) {
          if (subscription.usage.generationsThisMonth >= maxGenerationsPerMonth) {
            return false;
          }
        }
        
        // Check length limit
        if (maxNovelLength !== Infinity) {
          if (requestedLength > maxNovelLength) {
            return false;
          }
        }
        
        return true;
      },

      getRemainingGenerations: () => {
        const { subscription } = get();
        const { maxGenerationsPerMonth } = ensurePlan(subscription).limits;
        
        if (maxGenerationsPerMonth === Infinity) {
          return Infinity;
        }
        
        return Math.max(0, maxGenerationsPerMonth - subscription.usage.generationsThisMonth);
      }
    }),
    {
      name: 'novel-ai-subscription',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }
        const subscription = (persistedState as { subscription?: UserSubscription }).subscription;
        if (!subscription || !subscription.plan) {
          return {
            ...persistedState,
            subscription: getDefaultSubscription()
          };
        }
        return persistedState;
      }
    }
  )
);

