// Subscription types and definitions

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'unlimited';

export interface SubscriptionLimits {
  maxGenerationsPerMonth: number;
  maxNovelLength: number;
  maxProjects?: number;
  maxCharacters?: number;
  contextWindowWords?: number;
}

export interface SubscriptionFeatureFlags {
  canUseAdvancedFeatures: boolean;
  aiAssistant: boolean;
  styleMemory: boolean;
  characterManagement: boolean;
  knowledgeBase: boolean;
  versionHistory: boolean;
  collaboration: boolean;
  analytics: boolean;
  templateLibrary: boolean;
  prioritySupport: boolean;
  exportFormats: string[];
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  yearlyPrice?: number;
  description?: string;
  badge?: string;
  limits: SubscriptionLimits;
  features: SubscriptionFeatureFlags;
}

export interface UsageStats {
  generationsThisMonth: number;
  lastResetDate: number;
  totalGenerations: number;
  monthKey?: string;
  pagesUsed?: number;
  tokensUsed?: number;
}

export interface UserSubscription {
  tier: SubscriptionTier;
  plan: SubscriptionPlan;
  usage: UsageStats;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  trialEndsAt?: number;
  isActive: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    limits: {
      maxGenerationsPerMonth: 5,
      maxNovelLength: 30,
      maxProjects: 1,
      contextWindowWords: 2000
    },
    features: {
      canUseAdvancedFeatures: false,
      aiAssistant: false,
      styleMemory: false,
      characterManagement: false,
      knowledgeBase: false,
      versionHistory: false,
      collaboration: false,
      analytics: false,
      templateLibrary: false,
      prioritySupport: false,
      exportFormats: ['markdown']
    }
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    price: 12,
    yearlyPrice: 108,
    limits: {
      maxGenerationsPerMonth: 300,
      maxNovelLength: 100,
      maxProjects: 3,
      contextWindowWords: 4000
    },
    features: {
      canUseAdvancedFeatures: false,
      aiAssistant: false,
      styleMemory: false,
      characterManagement: false,
      knowledgeBase: false,
      versionHistory: true,
      collaboration: false,
      analytics: false,
      templateLibrary: true,
      prioritySupport: false,
      exportFormats: ['markdown', 'pdf']
    }
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price: 25,
    yearlyPrice: 240,
    limits: {
      maxGenerationsPerMonth: 500,
      maxNovelLength: 300,
      maxProjects: 10,
      contextWindowWords: 8000
    },
    features: {
      canUseAdvancedFeatures: true,
      aiAssistant: true,
      styleMemory: true,
      characterManagement: true,
      knowledgeBase: true,
      versionHistory: true,
      collaboration: false,
      analytics: true,
      templateLibrary: true,
      prioritySupport: true,
      exportFormats: ['markdown', 'pdf', 'docx', 'epub']
    }
  },
  unlimited: {
    tier: 'unlimited',
    name: 'Unlimited',
    price: 35,
    yearlyPrice: 336,
    limits: {
      maxGenerationsPerMonth: Number.MAX_SAFE_INTEGER,
      maxNovelLength: Number.MAX_SAFE_INTEGER,
      maxProjects: Number.MAX_SAFE_INTEGER,
      contextWindowWords: 32000  // Upgraded from 16K to 32K
    },
    features: {
      canUseAdvancedFeatures: true,
      aiAssistant: true,
      styleMemory: true,
      characterManagement: true,
      knowledgeBase: true,
      versionHistory: true,
      collaboration: true,
      analytics: true,
      templateLibrary: true,
      prioritySupport: true,
      exportFormats: ['markdown', 'pdf', 'docx', 'epub']
    }
  }
};

