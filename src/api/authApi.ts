import { useAuthStore, type AuthUser } from '../store/authStore';
import {
  useSubscriptionStore,
  type BackendSubscriptionPayload,
  type BackendUsagePayload
} from '../store/subscriptionStore';
import type { SubscriptionLimits, SubscriptionTier } from '../types/subscription';

// Always include /api prefix for auth requests
const API_BASE_URL = `${(import.meta.env.VITE_API_URL as string | undefined) || ''}/api`;
const AUTH_BASE = `${API_BASE_URL}/auth`;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const toSubscriptionPayload = (user: AuthUser): BackendSubscriptionPayload => ({
  tier: user.subscription?.tier ?? 'free',
  billingCycle: user.subscription?.billingCycle ?? 'monthly',
  status: user.subscription?.status ?? 'trialing',
  trialEndsAt: user.subscription?.trialEndsAt,
  limits: user.subscription?.limits,
  features: user.subscription?.features
});

const toUsagePayload = (user: AuthUser): BackendUsagePayload => ({
  monthKey: user.usage?.monthKey,
  generationsUsed: user.usage?.generationsUsed,
  pagesUsed: user.usage?.pagesUsed,
  tokensUsed: user.usage?.tokensUsed,
  lastResetAt: user.usage?.lastResetAt
});

const applyAuthResponse = (data: AuthResponse) => {
  const authStore = useAuthStore.getState();
  const subscriptionStore = useSubscriptionStore.getState();
  authStore.setUser(data.user);
  authStore.setToken(data.token);
  subscriptionStore.applyRemoteSubscription(toSubscriptionPayload(data.user), toUsagePayload(data.user));
};

const applyUserSnapshot = (user: AuthUser) => {
  const authStore = useAuthStore.getState();
  const subscriptionStore = useSubscriptionStore.getState();
  authStore.setUser(user);
  subscriptionStore.applyRemoteSubscription(toSubscriptionPayload(user), toUsagePayload(user));
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Request failed';
    try {
      const error = await response.json();
      // 后端使用 express-validator 时会返回 { errors: [{ msg, param, ... }] }
      if (Array.isArray(error?.errors) && error.errors.length > 0) {
        message =
          error.errors
            .map((e: { msg?: string; message?: string }) => e.msg || e.message)
            .filter(Boolean)
            .join(' · ') || message;
      } else {
        message = error.message || error.error || message;
      }
    } catch {
      // ignore JSON parse errors and fall back to default message
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
};

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await handleResponse<AuthResponse>(response);
  applyAuthResponse(data);
  return data;
}

export async function register(payload: RegisterData): Promise<AuthResponse> {
  const response = await fetch(`${AUTH_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<AuthResponse>(response);
  applyAuthResponse(data);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  const response = await fetch(`${AUTH_BASE}/me`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  const data = await handleResponse<{ user: AuthUser }>(response);
  applyUserSnapshot(data.user);
  return data.user;
}

export async function resumeSession(): Promise<AuthUser | null> {
  try {
    return await fetchCurrentUser();
  } catch (error) {
    console.warn('[Auth] Failed to resume session', error);
    useAuthStore.getState().logout();
    useSubscriptionStore.getState().reset();
    return null;
  }
}

export async function logout(): Promise<void> {
  const token = useAuthStore.getState().token;
  if (token) {
    try {
      await fetch(`${AUTH_BASE}/logout`, {
        method: 'POST',
        headers: { ...getAuthHeaders() }
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  }
  useAuthStore.getState().logout();
  useSubscriptionStore.getState().reset();
}

export async function refreshToken(): Promise<string | null> {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  try {
    const response = await fetch(`${AUTH_BASE}/refresh`, {
      method: 'POST',
      headers: { ...getAuthHeaders() }
    });
    const data = await handleResponse<{ token: string; user?: AuthUser }>(response);
    useAuthStore.getState().setToken(data.token);
    if (data.user) {
      applyUserSnapshot(data.user);
    }
    return data.token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await logout();
    return null;
  }
}

export async function updateSubscription(payload: {
  tier: SubscriptionTier;
  billingCycle?: 'monthly' | 'yearly';
  status?: 'active' | 'trialing' | 'past_due' | 'canceled';
}): Promise<AuthUser> {
  const response = await fetch(`${AUTH_BASE}/subscription`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse<{ user: AuthUser }>(response);
  applyUserSnapshot(data.user);
  return data.user;
}

export async function fetchUsage() {
  const response = await fetch(`${AUTH_BASE}/usage`, {
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<{ usage: BackendUsagePayload; limits: SubscriptionLimits }>(response);
}

export async function resetUsageSnapshot() {
  const response = await fetch(`${AUTH_BASE}/usage/reset`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return handleResponse<{ usage: BackendUsagePayload }>(response);
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
  const response = await fetch(`${AUTH_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<{ message: string }>(response);
}

export async function resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
  const response = await fetch(`${AUTH_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<{ message: string }>(response);
}

