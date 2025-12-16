import React from 'react';
import { usePoints } from '../context/PointsContext';

// PointsDisplay component - a capsule-shaped badge showing user points
const PointsDisplay: React.FC = () => {
  const { balance, loading } = usePoints();

  // Format balance with commas for better readability
  const formatBalance = (amount: number): string => {
    return amount.toLocaleString();
  };

  // Handle click event
  const handleClick = () => {
    // Placeholder for future functionality (e.g., navigate to pricing or show recharge modal)
    console.log('Points display clicked - balance:', balance);
    // Example: navigate('/pricing') or openRechargeModal()
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      aria-label="View points balance"
    >
      {/* Icon */}
      <span className="text-xl">💎</span>
      
      {/* Balance display with skeleton loader for loading state */}
      {loading ? (
        // Skeleton loader for loading state
        <div className="w-16 h-5 bg-slate-300 rounded-full animate-pulse" />
      ) : (
        <span 
          className="text-sm font-semibold text-slate-800 transition-all duration-300"
          style={{ opacity: balance > 0 ? 1 : 0.6 }}
        >
          {formatBalance(balance)}
        </span>
      )}
    </button>
  );
};

export default PointsDisplay;