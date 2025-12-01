import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../hooks/useSubscription';
import { fetchUsage } from '../api/authApi';

export type NotificationType = 'welcome' | 'quota-warning' | 'quota-exceeded' | 'usage-reset' | 'template-update' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  dismissible: boolean;
  createdAt: number;
  expiresAt?: number;
}

interface NotificationSystemProps {
  onDismiss?: (id: string) => void;
}

const NOTIFICATION_STORAGE_KEY = 'novel-ai-notifications';
const LAST_QUOTA_CHECK_KEY = 'novel-ai-last-quota-check';
const LAST_RESET_NOTIFICATION_KEY = 'novel-ai-last-reset-notification';

export function useNotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isAuthenticated } = useAuthStore();
  const { tier, usage, plan } = useSubscription();

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    setNotifications((prev) => {
      const filtered = prev.filter((n) => {
        if (n.expiresAt && n.expiresAt < Date.now()) {
          return false;
        }
        return true;
      });
      return [newNotification, ...filtered].slice(0, 5); // Keep max 5 notifications
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const dismissed = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || '[]') as string[];
    if (!dismissed.includes(id)) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([...dismissed, id]));
    }
  }, []);

  // Check quota and usage limits
  useEffect(() => {
    if (!isAuthenticated || !plan || !usage) return;

    const checkQuota = async () => {
      try {
        const lastCheck = localStorage.getItem(LAST_QUOTA_CHECK_KEY);
        const now = Date.now();
        // Only check every 5 minutes
        if (lastCheck && now - parseInt(lastCheck) < 5 * 60 * 1000) {
          return;
        }
        localStorage.setItem(LAST_QUOTA_CHECK_KEY, now.toString());

        const usageData = await fetchUsage();
        const generationsUsed = usageData.usage.generationsUsed || 0;
        const maxGenerations = plan.limits.maxGenerationsPerMonth;

        if (maxGenerations === Number.MAX_SAFE_INTEGER) {
          return; // Unlimited plan
        }

        const usagePercent = (generationsUsed / maxGenerations) * 100;

        // 80% warning
        if (usagePercent >= 80 && usagePercent < 100) {
          addNotification({
            type: 'quota-warning',
            title: 'Quota Warning',
            message: `You've used ${Math.round(usagePercent)}% of your monthly generations (${generationsUsed}/${maxGenerations}). Consider upgrading to avoid interruptions.`,
            actionLabel: 'View Plans',
            actionUrl: '/pricing',
            dismissible: true,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
          });
        }

        // 100% exceeded
        if (usagePercent >= 100) {
          addNotification({
            type: 'quota-exceeded',
            title: 'Monthly Quota Exceeded',
            message: `You've reached your monthly limit of ${maxGenerations} generations. Upgrade to continue writing.`,
            actionLabel: 'Upgrade Now',
            actionUrl: '/pricing',
            dismissible: false
          });
        }
      } catch (error) {
        console.error('[NotificationSystem] Failed to check quota:', error);
      }
    };

    checkQuota();
  }, [isAuthenticated, plan, usage, addNotification]);

  // Check for usage reset
  useEffect(() => {
    if (!isAuthenticated || !usage?.monthKey) return;

    const checkReset = () => {
      const lastNotification = localStorage.getItem(LAST_RESET_NOTIFICATION_KEY);
      const currentMonthKey = usage.monthKey;
      
      if (lastNotification !== currentMonthKey) {
        localStorage.setItem(LAST_RESET_NOTIFICATION_KEY, currentMonthKey || '');
        
        if (lastNotification) {
          // Month changed, show reset notification
          addNotification({
            type: 'usage-reset',
            title: 'Monthly Usage Reset',
            message: 'Your monthly generation quota has been reset. Start fresh with a new month of writing!',
            dismissible: true,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
          });
        }
      }
    };

    checkReset();
  }, [isAuthenticated, usage?.monthKey, addNotification]);

  // Welcome notification for new users
  useEffect(() => {
    if (!isAuthenticated) return;

    const user = useAuthStore.getState().user;
    if (!user) return;

    const welcomeShown = localStorage.getItem(`welcome-shown-${user.id}`);
    if (!welcomeShown) {
      localStorage.setItem(`welcome-shown-${user.id}`, 'true');
      addNotification({
        type: 'welcome',
        title: 'Welcome to Scribely!',
        message: `Welcome, ${user.name || user.email}! Start by creating your first project in Scribely or explore our templates and novel ai workflows.`,
        actionLabel: 'Get Started',
        actionUrl: '/generator',
        dismissible: true,
        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000 // 3 days
      });
    }
  }, [isAuthenticated, addNotification]);

  // Load dismissed notifications from storage
  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || '[]') as string[];
    setNotifications((prev) => prev.filter((n) => !dismissed.includes(n.id)));
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification
  };
}

export default function NotificationSystem({ onDismiss }: NotificationSystemProps) {
  const { notifications, dismissNotification } = useNotificationSystem();

  const handleDismiss = (id: string) => {
    dismissNotification(id);
    onDismiss?.(id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => {
        const bgColor =
          notification.type === 'quota-exceeded'
            ? 'bg-red-50 border-red-200'
            : notification.type === 'quota-warning'
            ? 'bg-amber-50 border-amber-200'
            : notification.type === 'welcome'
            ? 'bg-indigo-50 border-indigo-200'
            : notification.type === 'usage-reset'
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-white border-slate-200';

        const iconColor =
          notification.type === 'quota-exceeded'
            ? 'text-red-600'
            : notification.type === 'quota-warning'
            ? 'text-amber-600'
            : notification.type === 'welcome'
            ? 'text-indigo-600'
            : notification.type === 'usage-reset'
            ? 'text-emerald-600'
            : 'text-slate-600';

        return (
          <div
            key={notification.id}
            className={`rounded-2xl border shadow-lg p-4 ${bgColor} animate-in slide-in-from-right`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 ${iconColor}`}>
                {notification.type === 'quota-exceeded' || notification.type === 'quota-warning' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : notification.type === 'welcome' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : notification.type === 'usage-reset' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                {notification.actionLabel && notification.actionUrl && (
                  <a
                    href={notification.actionUrl}
                    className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {notification.actionLabel} →
                  </a>
                )}
              </div>
              {notification.dismissible && (
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


