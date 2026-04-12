import type { ReactNode } from 'react';
import { PrimaryButton } from './Button';
import { classNames } from './classNames';

export function LoadingState({ label = 'Loading...', className }: { label?: string; className?: string }) {
  return (
    <div
      className={classNames(
        'rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-4',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm text-app-text-muted">
        {label}
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ message, onRetry, retryLabel = 'Try again', className }: ErrorStateProps) {
  return (
    <div
      className={classNames(
        'rounded-[var(--ui-radius-sm)] border border-app-border bg-app-accent-soft p-4',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm text-app-accent-text">{message}</p>
      {onRetry && (
        <PrimaryButton className="mt-3" onClick={onRetry}>
          {retryLabel}
        </PrimaryButton>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={classNames(
        'rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-6',
        className
      )}
    >
      <p className="text-base font-medium text-app-text">{title}</p>
      {description && <p className="mt-1 text-sm text-app-text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
