import type { ReactNode } from 'react';

interface ErrorBannerProps {
  message?: string | null;
  correlationId?: string | null;
  className?: string;
  children?: ReactNode;
}

export default function ErrorBanner({ message, correlationId, className, children }: ErrorBannerProps) {
  if (!message && !children) return null;

  return (
    <div className={`rounded-md border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text ${className || ''}`}>
      {message && <p>{message}</p>}
      {correlationId && (
        <p className="mt-1 text-xs text-app-text-muted">Ref: {correlationId}</p>
      )}
      {children}
    </div>
  );
}
