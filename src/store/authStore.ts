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
      // TODO: 测试完成后删除此 Mock
      // 临时修改：Mock 一个已登录用户，绕过登录验证
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test Developer',
        avatar: 'https://ui-avatars.com/api/?name=Test+Developer&background=random',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        lastLoginAt: Date.now(),
        subscription: {
          tier: 'free',
          billingCycle: 'monthly',
          status: 'active',
          startedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          renewedAt: Date.now()
        },
        usage: {
          monthKey: '2024-01',
          generationsUsed: 5,
          pagesUsed: 1,
          tokensUsed: 1000,
          lastResetAt: Date.now() - 15 * 24 * 60 * 60 * 1000
        },
        preferences: {
          language: 'zh-CN',
          theme: 'light'
        }
      },
      token: 'test-token-123',
      isAuthenticated: true,

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

