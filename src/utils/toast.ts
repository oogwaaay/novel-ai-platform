// Lightweight Toast system for temporary notifications
export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // Auto-dismiss after this many ms (default: 3000)
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
  const id = crypto.randomUUID();
  const toast: Toast = { id, message, type, duration };
  
  toasts = [...toasts, toast];
  notifyListeners();
  
  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
  
  return id;
};

export const dismissToast = (id: string) => {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners();
};

export const subscribeToToasts = (listener: (toasts: Toast[]) => void) => {
  toastListeners.push(listener);
  listener([...toasts]); // Initial call
  
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
};

