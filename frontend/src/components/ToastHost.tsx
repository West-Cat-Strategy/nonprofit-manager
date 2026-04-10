import { useToast } from '../contexts/useToast';

const variantStyles: Record<string, string> = {
  error:
    'border-app-border border-l-4 border-l-red-600 bg-red-50 text-red-950 dark:bg-red-950/60 dark:text-red-50',
  success:
    'border-app-border border-l-4 border-l-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-50',
  info:
    'border-app-border border-l-4 border-l-app-accent bg-app-surface text-app-text-heading',
};

export default function ToastHost() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed right-4 z-50 flex w-full max-w-sm flex-col gap-3"
      style={{ bottom: 'calc(1rem + var(--team-messenger-toast-offset, 0px))' }}
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-md border px-4 py-3 text-sm shadow-lg ${variantStyles[toast.variant] || variantStyles.info}`}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{toast.message}</p>
              {toast.correlationId && (
                <p className="mt-1 text-xs opacity-75">Ref: {toast.correlationId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-xs font-semibold opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
