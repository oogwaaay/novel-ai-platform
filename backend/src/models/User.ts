export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'unlimited';
export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionFeatureFlags {
  aiAssistant: boolean;
  styleMemory: boolean;
  characterManagement: boolean;
  knowledgeBase: boolean;
  analytics: boolean;
  collaboration: boolean;
  templateLibrary: boolean;
  versionHistory: boolean;
  exportFormats: string[];
}

export interface SubscriptionLimits {
  maxGenerationsPerMonth: number;
  maxNovelLength: number;
  maxProjects?: number;
  maxCharacters?: number;
  contextWindowWords?: number;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  label: string;
  monthlyPrice: number;
  yearlyPrice: number;
  limits: SubscriptionLimits;
  features: SubscriptionFeatureFlags;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    label: '体验层',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      maxGenerationsPerMonth: 5,
      maxNovelLength: 30,
      maxProjects: 1,
      contextWindowWords: 2000
    },
    features: {
      aiAssistant: false,
      styleMemory: false,
      characterManagement: false,
      knowledgeBase: false,
      analytics: false,
      collaboration: false,
      templateLibrary: false,
      versionHistory: false,
      exportFormats: ['markdown']
    }
  },
  starter: {
    tier: 'starter',
    label: '工具层',
    monthlyPrice: 12,
    yearlyPrice: 108,
    limits: {
      maxGenerationsPerMonth: 300,
      maxNovelLength: 100,
      maxProjects: 3,
      contextWindowWords: 4000
    },
    features: {
      aiAssistant: false,
      styleMemory: false,
      characterManagement: false,
      knowledgeBase: false,
      analytics: false,
      collaboration: false,
      templateLibrary: true,
      versionHistory: true,
      exportFormats: ['markdown', 'pdf']
    }
  },
  pro: {
    tier: 'pro',
    label: '智能层',
    monthlyPrice: 25,
    yearlyPrice: 240,
    limits: {
      maxGenerationsPerMonth: 500,
      maxNovelLength: 300,
      maxProjects: 10,
      contextWindowWords: 8000
    },
    features: {
      aiAssistant: true,
      styleMemory: true,
      characterManagement: true,
      knowledgeBase: true,
      analytics: true,
      collaboration: false,
      templateLibrary: true,
      versionHistory: true,
      exportFormats: ['markdown', 'pdf', 'docx', 'epub']
    }
  },
  unlimited: {
    tier: 'unlimited',
    label: '协作层',
    monthlyPrice: 35,
    yearlyPrice: 336,
    limits: {
      maxGenerationsPerMonth: Number.MAX_SAFE_INTEGER,
      maxNovelLength: Number.MAX_SAFE_INTEGER,
      maxProjects: Number.MAX_SAFE_INTEGER,
      contextWindowWords: 16000
    },
    features: {
      aiAssistant: true,
      styleMemory: true,
      characterManagement: true,
      knowledgeBase: true,
      analytics: true,
      collaboration: true,
      templateLibrary: true,
      versionHistory: true,
      exportFormats: ['markdown', 'pdf', 'docx', 'epub']
    }
  }
};

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  startedAt: number;
  renewedAt: number;
  trialEndsAt?: number;
}

export interface UsageSnapshot {
  monthKey: string;
  generationsUsed: number;
  pagesUsed: number;
  tokensUsed: number;
  lastResetAt: number;
}

export interface UserPreferences {
  language?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt: number;
  isActive: boolean;
  subscription: SubscriptionInfo;
  usage: UsageSnapshot;
  preferences?: UserPreferences;
  oauthProvider?: 'google' | 'github';
  oauthId?: string;
}

export interface UserUsageDelta {
  generations?: number;
  pages?: number;
  tokens?: number;
}

