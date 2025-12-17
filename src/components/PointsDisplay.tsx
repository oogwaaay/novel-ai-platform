import React, { useState, useEffect, useRef } from 'react';
import { usePoints } from '../context/PointsContext';

// PointsDisplay component - a capsule-shaped badge showing user points with animated balance
const PointsDisplay = () => {
  const { balance, availableBalance, loading, error } = usePoints();
  const [displayBalance, setDisplayBalance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevBalanceRef = useRef(balance);

  // Format balance with commas for better readability
  const formatBalance = (value: number) => {
    return value.toLocaleString();
  };

  // Animate balance changes
  useEffect(() => {
    if (!loading && !error) {
      // Only animate if balance actually changed
      if (balance !== prevBalanceRef.current) {
        setIsAnimating(true);
        const start = prevBalanceRef.current;
        const end = balance;
        const duration = 1000; // 1 second
        const startTime = performance.now();

        const animate = (timestamp: number) => {
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(start + (end - start) * easeOutCubic);
          setDisplayBalance(current);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            prevBalanceRef.current = balance;
            setIsAnimating(false);
          }
        };

        requestAnimationFrame(animate);
      } else {
        // Reset display balance if loading or error
        setDisplayBalance(balance);
        prevBalanceRef.current = balance;
      }
    }
  }, [balance, loading, error]);

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
        {/* Icon with bounce animation on balance change */}
        <span className="text-xl text-indigo-600 group-hover:text-indigo-700 transition-all duration-300 animate-bounce-on-update">💎</span>
        
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
            {/* Balance with animated number */}
            <span 
              className="text-sm font-semibold text-slate-800 transition-all duration-300"
            >
              {formatBalance(displayBalance)}
            </span>
            
            {/* Action hint */}
            <span className="text-xs text-indigo-500 group-hover:text-indigo-600 transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap">
              积分
            </span>
          </>
        )}
      </button>
      
      {/* Tooltip on hover - expanded with more info */}
      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30">
        <p className="text-sm font-semibold text-slate-800 mb-1">积分余额</p>
        <p className="text-xs text-slate-600 mb-1">{formatBalance(displayBalance)} 积分</p>
        <p className="text-xs text-indigo-600 mb-2">可用积分: {formatBalance(availableBalance)}</p>
        <div className="space-y-1 text-xs">
          <p className="text-amber-600 flex items-start">
            ⚠️ <span className="ml-1">赠送积分：7-90天内有效</span>
          </p>
          <p className="text-green-600 flex items-start">
            ✅ <span className="ml-1">付费积分：永久有效</span>
          </p>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          用于AI生成、续写和助手功能，<br />
          <span className="text-indigo-600 cursor-pointer hover:underline">点击前往充值</span>
        </p>
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Pro 用户享受无限积分特权
          </p>
        </div>
      </div>
    </div>
  );
};

export default PointsDisplay;