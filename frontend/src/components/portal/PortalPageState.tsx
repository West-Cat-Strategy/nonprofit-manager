import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../ui';

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
        <EmptyState className={spacingClass} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return null;
}
