import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalListCard from '../../../components/portal/PortalListCard';
import { portalV2ApiClient } from '../../../features/portal/api/portalApiClient';
import type { PortalCaseSummary } from '../../../features/portal/types/contracts';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';

export default function PortalCases() {
  const [cases, setCases] = useState<PortalCaseSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedCaseId } = usePersistentPortalCaseContext();

  const filteredCases = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...cases].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    if (!needle) {
      return sorted;
    }

    return sorted.filter((item) => {
      const haystack = [item.case_number, item.title, item.status_name, item.case_type_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [cases, searchTerm]);

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
    <PortalPageShell
      title="My Cases"
      description="Only case files explicitly shared by staff are shown."
      actions={
        <input
          aria-label="Search portal cases"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search cases"
          className="rounded-md border border-app-input-border px-3 py-2 text-sm"
        />
      }
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && filteredCases.length === 0}
        loadingLabel="Loading your cases..."
        emptyTitle={searchTerm ? 'No matching cases.' : 'No shared cases yet.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Ask staff to mark a case as client-viewable.'
        }
        onRetry={loadCases}
      />

      {!loading && !error && filteredCases.length > 0 && (
        <div className="space-y-3">
          {filteredCases.map((item) => (
            <Link
              key={item.id}
              to={`/portal/cases/${item.id}`}
              className="block"
              onClick={() => setSelectedCaseId(item.id)}
            >
              <PortalListCard
                title={item.title}
                subtitle={item.case_number}
                meta={`Updated ${new Date(item.updated_at).toLocaleDateString()}`}
                badges={
                  <>
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
                  </>
                }
              />
            </Link>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
