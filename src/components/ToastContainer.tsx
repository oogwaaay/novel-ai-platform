import { useEffect, useState } from 'react';
import { subscribeToToasts, type Toast } from '../utils/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribeToToasts(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => {
        const bgColor =
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : toast.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-blue-50 border-blue-200 text-blue-800';

        return (
          <div
            key={toast.id}
            className={`rounded-lg border shadow-lg px-4 py-3 text-sm font-medium animate-in slide-in-from-bottom ${bgColor}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

