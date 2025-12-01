import { Link } from 'react-router-dom';
import type { SubscriptionTier } from '../types/subscription';

interface UpgradePromptProps {
  currentTier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  featureName: string;
  onDismiss?: () => void;
  variant?: 'inline' | 'modal' | 'banner';
}

const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'unlimited'];

export default function UpgradePrompt({
  currentTier,
  requiredTier,
  featureName,
  onDismiss,
  variant = 'inline'
}: UpgradePromptProps) {
  const currentIndex = tierOrder.indexOf(currentTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  const needsUpgrade = currentIndex < requiredIndex;

  if (!needsUpgrade) return null;

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-slate-50 to-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {featureName} requires {requiredTier} plan
            </p>
            <p className="text-xs text-slate-600">Upgrade to unlock this feature</p>
          </div>
        </div>
        <Link
          to="/pricing"
          className="px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Upgrade Required</h3>
              <p className="text-slate-600">
                {featureName} is available on the <strong>{requiredTier}</strong> plan.
              </p>
            </div>
            <div className="flex gap-3">
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Maybe later
                </button>
              )}
              <Link
                to="/pricing"
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition text-center"
              >
                View plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-sm text-slate-600 mb-3">
        <strong className="text-slate-900">{featureName}</strong> is available on the <strong>{requiredTier}</strong> plan.
      </p>
      <Link
        to="/pricing"
        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition"
      >
        Upgrade to {requiredTier}
      </Link>
    </div>
  );
}



