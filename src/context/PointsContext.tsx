import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getWalletBalance, type UserWallet } from '../api/pointsApi';
import { useAuthStore } from '../store/authStore';

// Define context type
interface PointsContextType {
  balance: number;
  totalEarned: number;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

// Create context with default values
const PointsContext = createContext<PointsContextType>({
  balance: 0,
  totalEarned: 0,
  loading: true,
  error: null,
  refreshBalance: async () => {}
});

// Define props for PointsProvider
interface PointsProviderProps {
  children: ReactNode;
}

// PointsProvider component
export const PointsProvider: React.FC<PointsProviderProps> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, user } = useAuthStore();

  // Fetch wallet balance from API
  const fetchBalance = async () => {
    if (!isAuthenticated || !user) {
      setBalance(0);
      setTotalEarned(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletData = await getWalletBalance();
      setBalance(walletData.balance);
      setTotalEarned(walletData.total_earned);
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
      setError('Failed to load points balance');
    } finally {
      setLoading(false);
    }
  };

  // Refresh balance function
  const refreshBalance = async () => {
    await fetchBalance();
  };

  // Initial fetch on component mount and when authentication state changes
  useEffect(() => {
    fetchBalance();
  }, [isAuthenticated, user]);

  // Set up polling for real-time updates (every 10 seconds)
  // This is a fallback if WebSocket connection is not available
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Context value
  const contextValue: PointsContextType = {
    balance,
    totalEarned,
    loading,
    error,
    refreshBalance
  };

  return (
    <PointsContext.Provider value={contextValue}>
      {children}
    </PointsContext.Provider>
  );
};

// Custom hook to use points context
export const usePoints = (): PointsContextType => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};