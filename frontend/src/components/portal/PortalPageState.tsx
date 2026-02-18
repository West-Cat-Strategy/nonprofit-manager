interface PortalPageStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  retryLabel?: string;
  onRetry?: () => void;
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
}: PortalPageStateProps) {
  if (loading) {
    return <p className="text-sm text-app-text-muted mt-2">{loadingLabel}</p>;
  }

  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-red-700 border border-red-200 hover:bg-red-100"
          >
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="mt-4 rounded-lg border border-app-border bg-app-surface-muted px-4 py-4">
        <p className="text-sm font-medium text-app-text">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 text-sm text-app-text-muted">{emptyDescription}</p>}
      </div>
    );
  }

  return null;
}

