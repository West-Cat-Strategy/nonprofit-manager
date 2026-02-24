import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalPageState from '../components/portal/PortalPageState';
import { portalV2ApiClient } from '../features/portal/api/portalApiClient';
import type { PortalCaseSummary } from '../features/portal/types/contracts';

export default function PortalCases() {
  const [cases, setCases] = useState<PortalCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setError(null);
      const rows = await portalV2ApiClient.listCases();
      setCases(rows || []);
    } catch (err) {
      console.error('Failed to load portal cases', err);
      setError('Unable to load cases right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">My Cases</h2>
      <p className="mt-1 text-sm text-app-text-muted">
        Only case files explicitly shared by staff are shown.
      </p>
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && cases.length === 0}
        loadingLabel="Loading your cases..."
        emptyTitle="No shared cases yet."
        emptyDescription="Ask staff to mark a case as client-viewable."
        onRetry={loadCases}
      />

      {!loading && !error && cases.length > 0 && (
        <div className="mt-4 space-y-3">
          {cases.map((item) => (
            <Link
              key={item.id}
              to={`/portal/cases/${item.id}`}
              className="block rounded-lg border border-app-border bg-app-surface p-4 hover:bg-app-surface-muted"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    {item.case_number}
                  </p>
                  <p className="text-sm font-semibold text-app-text">{item.title}</p>
                </div>
                <div className="text-xs text-app-text-muted">
                  Updated {new Date(item.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {item.status_name && (
                  <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted">
                    {item.status_name}
                  </span>
                )}
                {item.case_type_name && (
                  <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted">
                    {item.case_type_name}
                  </span>
                )}
                {item.priority && (
                  <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted capitalize">
                    {item.priority}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

