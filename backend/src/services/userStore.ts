import { randomUUID } from 'node:crypto';
import type {
  BillingCycle,
  SubscriptionTier,
  User,
  UserUsageDelta,
  UsageSnapshot,
  SubscriptionInfo
} from '../models/User';
import { SUBSCRIPTION_PLANS } from '../models/User';
import { supabaseAdmin } from './supabaseClient';

const users = new Map<string, User>();
const usersByEmail = new Map<string, string>();

type DbUserRow = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  password_hash: string | null;
  created_at: string | null;
  last_login_at: string | null;
  is_active: boolean | null;

  subscription_tier: string | null;
  billing_cycle: string | null;
  subscription_status: string | null;
  subscription_started_at: string | null;
  subscription_renewed_at: string | null;
  trial_ends_at: string | null;

  usage_month_key: string | null;
  generations_used: number | null;
  pages_used: number | null;
  tokens_used: number | null;
  usage_last_reset_at: string | null;

  preferences: any | null;
  oauth_provider: string | null;
  oauth_id: string | null;
};

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

const mapRowToUser = (row: DbUserRow): User => {
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const lastLoginAt = row.last_login_at ? new Date(row.last_login_at).getTime() : createdAt;

  const subscription: SubscriptionInfo = {
    tier: (row.subscription_tier || 'free') as SubscriptionTier,
    billingCycle: (row.billing_cycle || 'monthly') as BillingCycle,
    status: (row.subscription_status || 'active') as SubscriptionInfo['status'],
    startedAt: row.subscription_started_at
      ? new Date(row.subscription_started_at).getTime()
      : createdAt,
    renewedAt: row.subscription_renewed_at
      ? new Date(row.subscription_renewed_at).getTime()
      : lastLoginAt,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : undefined
  };

  const usage: UsageSnapshot = {
    monthKey: row.usage_month_key || getMonthKey(createdAt),
    generationsUsed: row.generations_used ?? 0,
    pagesUsed: row.pages_used ?? 0,
    tokensUsed: row.tokens_used ?? 0,
    lastResetAt: row.usage_last_reset_at
      ? new Date(row.usage_last_reset_at).getTime()
      : createdAt
  };

  const user: User = {
    id: row.id,
    email: row.email,
    name: row.name || undefined,
    avatar: row.avatar || undefined,
    passwordHash: row.password_hash || '',
    createdAt,
    lastLoginAt,
    isActive: row.is_active ?? true,
    subscription,
    usage,
    preferences: (row.preferences as any) || undefined,
    oauthProvider: (row.oauth_provider as any) || undefined,
    oauthId: row.oauth_id || undefined
  };

  return user;
};

const buildRowFromUser = (user: User): Partial<DbUserRow> => {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatar: user.avatar ?? null,
    password_hash: user.passwordHash,
    created_at: new Date(user.createdAt).toISOString(),
    last_login_at: new Date(user.lastLoginAt).toISOString(),
    is_active: user.isActive,
    subscription_tier: user.subscription.tier,
    billing_cycle: user.subscription.billingCycle,
    subscription_status: user.subscription.status,
    subscription_started_at: new Date(user.subscription.startedAt).toISOString(),
    subscription_renewed_at: new Date(user.subscription.renewedAt).toISOString(),
    trial_ends_at: user.subscription.trialEndsAt
      ? new Date(user.subscription.trialEndsAt).toISOString()
      : null,
    usage_month_key: user.usage.monthKey,
    generations_used: user.usage.generationsUsed,
    pages_used: user.usage.pagesUsed,
    tokens_used: user.usage.tokensUsed,
    usage_last_reset_at: new Date(user.usage.lastResetAt).toISOString(),
    preferences: user.preferences ?? null,
    oauth_provider: user.oauthProvider ?? null,
    oauth_id: user.oauthId ?? null
  };
};

const useSupabase = !!supabaseAdmin;

export const getUserById = async (id: string): Promise<User | null> => {
  if (!useSupabase) {
    return touchUser(users.get(id));
  }

  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getUserById error', error);
    return null;
  }

  if (!data) return null;
  const user = mapRowToUser(data as DbUserRow);
  users.set(user.id, user);
  usersByEmail.set(user.email, user.id);
  return touchUser(user);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalized = normalizeEmail(email);
  if (!useSupabase) {
    const id = usersByEmail.get(normalized);
    if (!id) return null;
    return getUserById(id);
  }

  const { data, error } = await supabaseAdmin!
    .from('users')
    .select('*')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getUserByEmail error', error);
    return null;
  }

  if (!data) return null;
  const user = mapRowToUser(data as DbUserRow);
  users.set(user.id, user);
  usersByEmail.set(user.email, user.id);
  return touchUser(user);
};

export const createUserRecord = async (data: {
  email: string;
  passwordHash: string;
  name?: string;
  avatar?: string;
  oauthProvider?: 'google' | 'github';
  oauthId?: string;
}): Promise<User> => {
  const now = Date.now();
  const email = normalizeEmail(data.email);
  const baseUser: User = {
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

  if (!useSupabase) {
    users.set(baseUser.id, baseUser);
    usersByEmail.set(email, baseUser.id);
    return baseUser;
  }

  const row = buildRowFromUser(baseUser);
  const { error } = await supabaseAdmin!.from('users').insert(row);
  if (error) {
    console.error('[Supabase] createUserRecord error', error);
  }

  users.set(baseUser.id, baseUser);
  usersByEmail.set(email, baseUser.id);
  return baseUser;
};

export const updateUser = async (
  id: string,
  updater: (user: User) => User | void
): Promise<User | null> => {
  let existing = users.get(id);
  if (!existing && useSupabase) {
    existing = await getUserById(id) || undefined;
  }
  if (!existing) {
    return null;
  }
  const draft = { ...existing };
  const result = updater(draft);
  const nextUser = (result as User) || draft;

  users.set(id, nextUser);
  usersByEmail.set(nextUser.email, nextUser.id);

  if (useSupabase) {
    const row = buildRowFromUser(nextUser);
    const { error } = await supabaseAdmin!
      .from('users')
      .upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[Supabase] updateUser error', error);
    }
  }

  return touchUser(nextUser);
};

export const setUserSubscription = async (
  id: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  status: User['subscription']['status'] = 'active'
): Promise<User | null> => {
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

export const recordUsage = async (
  id: string,
  delta: UserUsageDelta
): Promise<User | null> => {
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

export const upsertUserAvatar = async (
  id: string,
  avatar: string
): Promise<User | null> =>
  updateUser(id, (user) => {
    user.avatar = avatar;
    return user;
  });

export const listAllUsers = async (): Promise<User[]> => {
  if (useSupabase) {
    const { data, error } = await supabaseAdmin!.from('users').select('*');
    if (error) {
      console.error('[Supabase] listAllUsers error', error);
      return [];
    }
    const result = (data as DbUserRow[]).map(mapRowToUser);
    result.forEach((u) => {
      users.set(u.id, u);
      usersByEmail.set(u.email, u.id);
    });
    return result.map((u) => touchUser(u)!).filter(Boolean);
  }
  return Array.from(users.values()).map((user) => touchUser(user)!);
};

export const resetStore = (): void => {
  users.clear();
  usersByEmail.clear();
};


