import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  SubscriptionFeatureFlags,
  SubscriptionLimits,
  SubscriptionTier
} from '../types/subscription';

export interface UserSubscriptionSnapshot {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  startedAt: number;
  renewedAt: number;
  trialEndsAt?: number;
  limits?: SubscriptionLimits;
  features?: SubscriptionFeatureFlags;
}

export interface UserUsageSnapshot {
  monthKey?: string;
  generationsUsed?: number;
  pagesUsed?: number;
  tokensUsed?: number;
  lastResetAt?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: number;
  lastLoginAt: number;
  subscription?: UserSubscriptionSnapshot;
  usage?: UserUsageSnapshot;
  preferences?: {
    language?: string;
    theme?: 'light' | 'dark' | 'system';
  };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user
        }),

      setToken: (token) => set({ token }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
    }),
    {
      name: 'novel-ai-auth',
      storage: createJSONStorage(() => localStorage),
      version: 2
    }
  )
);

