/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ToastItem } from './toastStore';
import { createToastId } from './toastStore';

interface ToastContextValue {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string, correlationId?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = createToastId();
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => removeToast(id), 6000);
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => {
    pushToast({ message, variant: 'success' });
  }, [pushToast]);

  const showError = useCallback((message: string, correlationId?: string) => {
    pushToast({ message, variant: 'error', correlationId });
  }, [pushToast]);

  const value = useMemo(
    () => ({ toasts, pushToast, removeToast, showSuccess, showError }),
    [toasts, pushToast, removeToast, showSuccess, showError]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

// useToast moved to contexts/useToast.ts
