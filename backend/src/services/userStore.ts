import { randomUUID } from 'node:crypto';
import type {
  BillingCycle,
  SubscriptionTier,
  User,
  UserUsageDelta,
  UsageSnapshot
} from '../models/User';
import { SUBSCRIPTION_PLANS } from '../models/User';

const users = new Map<string, User>();
const usersByEmail = new Map<string, string>();

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getMonthKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const createUsageSnapshot = (timestamp = Date.now()): UsageSnapshot => ({
  monthKey: getMonthKey(timestamp),
  generationsUsed: 0,
  pagesUsed: 0,
  tokensUsed: 0,
  lastResetAt: timestamp
});

const ensureUsageWindow = (user: User): User => {
  const monthKey = getMonthKey();
  if (user.usage.monthKey !== monthKey) {
    user.usage = createUsageSnapshot();
  }
  return user;
};

const ensureTrialState = (user: User): User => {
  if (
    user.subscription.status === 'trialing' &&
    user.subscription.trialEndsAt &&
    user.subscription.trialEndsAt < Date.now()
  ) {
    user.subscription.status = 'active';
    user.subscription.trialEndsAt = undefined;
    user.subscription.renewedAt = Date.now();
  }
  return user;
};

const touchUser = (user: User | undefined | null): User | null => {
  if (!user) return null;
  const updated = ensureTrialState(ensureUsageWindow(user));
  users.set(updated.id, updated);
  return updated;
};

export const getUserById = (id: string): User | null => touchUser(users.get(id));

export const getUserByEmail = (email: string): User | null => {
  const id = usersByEmail.get(normalizeEmail(email));
  if (!id) return null;
  return getUserById(id);
};

export const createUserRecord = (data: {
  email: string;
  passwordHash: string;
  name?: string;
  avatar?: string;
  oauthProvider?: 'google' | 'github';
  oauthId?: string;
}): User => {
  const now = Date.now();
  const email = normalizeEmail(data.email);
  const user: User = {
    id: randomUUID(),
    email,
    name: data.name?.trim() || undefined,
    avatar: data.avatar,
    passwordHash: data.passwordHash,
    createdAt: now,
    lastLoginAt: now,
    isActive: true,
    subscription: {
      tier: 'free',
      billingCycle: 'monthly',
      status: 'active', // No trial period
      startedAt: now,
      renewedAt: now
    },
    usage: createUsageSnapshot(now),
    preferences: {
      language: 'zh-CN'
    },
    oauthProvider: data.oauthProvider,
    oauthId: data.oauthId
  };

  users.set(user.id, user);
  usersByEmail.set(email, user.id);
  return user;
};

export const updateUser = (id: string, updater: (user: User) => User | void): User | null => {
  const existing = users.get(id);
  if (!existing) {
    return null;
  }
  const draft = { ...existing };
  const result = updater(draft);
  const nextUser = (result as User) || draft;
  users.set(id, nextUser);
  usersByEmail.set(nextUser.email, nextUser.id);
  return touchUser(nextUser);
};

export const setUserSubscription = (
  id: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  status: User['subscription']['status'] = 'active'
): User | null => {
  return updateUser(id, (user) => {
    user.subscription = {
      tier,
      billingCycle,
      status,
      startedAt: user.subscription.startedAt || Date.now(),
      renewedAt: Date.now(),
      trialEndsAt: status === 'trialing' ? Date.now() + TRIAL_DURATION_MS : undefined
    };
    return user;
  });
};

export const recordUsage = (id: string, delta: UserUsageDelta): User | null => {
  return updateUser(id, (user) => {
    const refreshed = ensureUsageWindow(user);
    refreshed.usage = {
      ...refreshed.usage,
      generationsUsed: Math.max(
        0,
        refreshed.usage.generationsUsed + (delta.generations ?? 0)
      ),
      pagesUsed: Math.max(0, refreshed.usage.pagesUsed + (delta.pages ?? 0)),
      tokensUsed: Math.max(0, refreshed.usage.tokensUsed + (delta.tokens ?? 0)),
      lastResetAt: refreshed.usage.lastResetAt
    };
    return refreshed;
  });
};

export const serializeUser = (user: User) => {
  const plan = SUBSCRIPTION_PLANS[user.subscription.tier];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    subscription: {
      ...user.subscription,
      limits: plan.limits,
      features: plan.features
    },
    usage: user.usage,
    preferences: user.preferences
  };
};

export const upsertUserAvatar = (id: string, avatar: string): User | null =>
  updateUser(id, (user) => {
    user.avatar = avatar;
    return user;
  });

export const listAllUsers = (): User[] => Array.from(users.values()).map((user) => touchUser(user)!);

export const resetStore = () => {
  users.clear();
  usersByEmail.clear();
};


