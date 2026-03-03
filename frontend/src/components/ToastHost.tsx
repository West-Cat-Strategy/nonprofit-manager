import { useToast } from '../contexts/useToast';

const variantStyles: Record<string, string> = {
  error: 'border-app-border bg-app-accent-soft text-app-accent-text',
  success: 'border-app-border bg-app-accent-soft text-app-accent-text',
  info: 'border-app-accent-soft bg-app-accent-soft text-app-accent',
};

export default function ToastHost() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-md border px-4 py-3 text-sm shadow-lg ${variantStyles[toast.variant] || variantStyles.info}`}
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
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
