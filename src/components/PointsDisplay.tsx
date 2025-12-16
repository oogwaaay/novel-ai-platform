import React from 'react';
import { usePoints } from '../context/PointsContext';

// PointsDisplay component - a capsule-shaped badge showing user points
const PointsDisplay: React.FC = () => {
  const { balance, loading, error } = usePoints();

  // Format balance with commas for better readability
  const formatBalance = (amount: number): string => {
    return amount.toLocaleString();
  };

  // Handle click event
  const handleClick = () => {
    // Navigate to pricing page for recharge options
    window.location.href = '/pricing';
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 hover:bg-gradient-to-r from-indigo-100 to-purple-100 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group"
        aria-label="View points balance"
        title="查看积分余额，点击前往充值"
      >
        {/* Icon */}
        <span className="text-xl text-indigo-600 group-hover:text-indigo-700 transition-colors">💎</span>
        
        {/* Balance display with skeleton loader for loading state */}
        {loading ? (
          // Skeleton loader for loading state
          <div className="w-16 h-5 bg-indigo-200 rounded-full animate-pulse" />
        ) : error ? (
          // Error state
          <span 
            className="text-sm font-semibold text-rose-600 transition-all duration-300"
            title="Failed to load points balance"
          >
            --
          </span>
        ) : (
          <>
            {/* Balance */}
            <span 
              className="text-sm font-semibold text-slate-800 transition-all duration-300"
            >
              {formatBalance(balance)}
            </span>
            
            {/* Action hint */}
            <span className="text-xs text-indigo-500 group-hover:text-indigo-600 transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap">
              积分
            </span>
          </>
        )}
      </button>
      
      {/* Tooltip on hover - can be expanded with more info */}
      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30">
        <p className="text-sm font-semibold text-slate-800 mb-1">积分余额</p>
        <p className="text-xs text-slate-600 mb-2">{formatBalance(balance)} 积分</p>
        <p className="text-xs text-slate-500">
          用于AI生成、续写和助手功能，<br />
          <span className="text-indigo-600 cursor-pointer hover:underline">点击前往充值</span>
        </p>
      </div>
    </div>
  );
};

export default PointsDisplay;