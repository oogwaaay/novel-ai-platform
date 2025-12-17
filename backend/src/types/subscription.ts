// Subscription types and definitions for backend

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
  limits: SubscriptionLimits;
  features: SubscriptionFeatureFlags;
  monthlyPoints: number; // 每月积分津贴
  unlimitedText: boolean; // 是否支持无限文本生成
  pointsRollover: boolean; // 是否支持积分滚存
  pointsCap: number; // 最大积分上限
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

// Simplified subscription plans for backend usage
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
    },
    monthlyPoints: 500,
    unlimitedText: false,
    pointsRollover: false,
    pointsCap: 0
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
    },
    monthlyPoints: 5000,
    unlimitedText: false,
    pointsRollover: false,
    pointsCap: 0
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price: 25,
    yearlyPrice: 240,
    limits: {
      maxGenerationsPerMonth: Infinity,
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
    },
    monthlyPoints: 2000,
    unlimitedText: true,
    pointsRollover: false,
    pointsCap: 0
  },
  unlimited: {
    tier: 'unlimited',
    name: 'Unlimited',
    price: 39.9,
    yearlyPrice: 384,
    limits: {
      maxGenerationsPerMonth: Infinity,
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
    },
    monthlyPoints: 10000,
    unlimitedText: true,
    pointsRollover: true,
    pointsCap: 0
  }
};
