export type ToastVariant = 'error' | 'success' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  correlationId?: string;
}

export const createToastId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
