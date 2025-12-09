import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { PrimaryButton } from '../components/ui/PrimaryButton';

// 定义页面状态类型
type PageState = 'loading' | 'success' | 'error';

export default function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 第一步：获取 URL 参数
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('session_id');
    setSessionId(id);

    if (!id) {
      setPageState('error');
      return;
    }

    // 第二步：模拟加载状态
    // 模拟后端验证 - 2秒延迟
    const timer = setTimeout(() => {
      setPageState('success');
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.search]);

  // 处理按钮点击
  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-4">
      <SEO
        title="Payment Status"
        description="Check your payment status and subscription activation"
      />

      <div className="max-w-md w-full text-center">
        {/* Loading State */}
        {pageState === 'loading' && (
          <div className="space-y-6">
            {/* Loading Spinner */}
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin"></div>
            </div>
            {/* Loading Text */}
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Verifying payment...
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Please wait while we confirm your payment details.
            </p>
          </div>
        )}

        {/* Success State */}
        {pageState === 'success' && (
          <div className="space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-5xl">✅</span>
              </div>
            </div>
            {/* Success Text */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Payment Successful
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Your subscription has been activated.
            </p>
            {/* Action Button */}
            <div className="pt-4">
              <PrimaryButton
                onClick={handleDashboardClick}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              >
                Go to Dashboard
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Error State */}
        {pageState === 'error' && (
          <div className="space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-5xl">❌</span>
              </div>
            </div>
            {/* Error Text */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Invalid Request
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              We couldn't verify your payment. Please try again or contact support.
            </p>
            {/* Action Button */}
            <div className="pt-4">
              <PrimaryButton
                onClick={handleHomeClick}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              >
                Return to Home
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}