import { useAuthStore } from '../store/authStore';

// Always include /api prefix for points requests
const API_BASE_URL = `${(import.meta.env.VITE_API_URL as string | undefined) || ''}/api`;

// Get auth headers for API requests
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Interface for user wallet response
export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  total_earned: number;
  updated_at: string;
}

// Get user wallet balance
export async function getWalletBalance(): Promise<UserWallet> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/user/wallet`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wallet balance');
  }

  return response.json();
}

// Get user points transactions
export interface PointsTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  source: string;
  description: string;
  created_at: string;
  expires_at: string | null;
}

// Get user points transactions with pagination
export async function getPointsTransactions(limit: number = 20, offset: number = 0): Promise<{
  transactions: PointsTransaction[];
  meta: {
    limit: number;
    offset: number;
    count: number;
  };
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/user/wallet/transactions?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch points transactions');
  }

  return response.json();
}

// Deduct points from user wallet
export async function deductPoints(amount: number, type: string, description?: string): Promise<{
  success: boolean;
  amount_deducted: number;
  new_balance: number;
  wallet: UserWallet;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/user/wallet/deduct`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount,
      type,
      description
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to deduct points');
  }

  return response.json();
}