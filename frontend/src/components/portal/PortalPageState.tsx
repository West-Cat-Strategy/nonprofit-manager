import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../ui';
import { classNames } from '../ui/classNames';

interface PortalPageStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  retryLabel?: string;
  onRetry?: () => void;
  title?: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
  emptyIcon?: ReactNode;
}

export default function PortalPageState({
  loading,
  error,
  empty,
  loadingLabel = 'Loading...',
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
  retryLabel = 'Try again',
  onRetry,
  title,
  description,
  actions,
  compact = false,
  emptyIcon,
}: PortalPageStateProps) {
  const spacingClass = compact ? 'mt-2' : 'mt-4';

  if (loading) {
    return (
      <div>
        {(title || description || actions) && (
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              {title && <h3 className="text-base font-semibold text-app-text">{title}</h3>}
              {description && <p className="text-sm text-app-text-muted">{description}</p>}
            </div>
            {actions}
          </div>
        )}
        <LoadingState className={spacingClass} label={loadingLabel} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {(title || description || actions) && (
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              {title && <h3 className="text-base font-semibold text-app-text">{title}</h3>}
              {description && <p className="text-sm text-app-text-muted">{description}</p>}
            </div>
            {actions}
          </div>
        )}
        <ErrorState className={spacingClass} message={error} onRetry={onRetry} retryLabel={retryLabel} />
      </div>
    );
  }

  if (empty) {
    return (
      <div>
        {(title || description || actions) && (
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              {title && <h3 className="text-base font-semibold text-app-text">{title}</h3>}
              {description && <p className="text-sm text-app-text-muted">{description}</p>}
            </div>
            {actions}
          </div>
        )}
        {emptyIcon ? (
          <div
            className={classNames(
              'rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-6 transition-colors duration-150',
              spacingClass
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface text-app-accent">
                {emptyIcon}
              </span>
              <div>
                <p className="text-base font-medium text-app-text">{emptyTitle}</p>
                {emptyDescription && <p className="mt-1 text-sm text-app-text-muted">{emptyDescription}</p>}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState className={spacingClass} title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    );
  }

  return null;
}
