import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import { portalV2ApiClient } from '../../../features/portal/api/portalApiClient';
import type { PortalCaseSummary } from '../../../features/portal/types/contracts';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';

export default function PortalCases() {
  const [cases, setCases] = useState<PortalCaseSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'updated_at' | 'title' | 'status_name' | 'case_number'>(
    'updated_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedCaseId } = usePersistentPortalCaseContext();

  const filteredCases = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...cases].sort((a, b) => {
      if (sortField === 'updated_at') {
        const delta = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        return sortOrder === 'asc' ? delta : -delta;
      }

      const left = String(a[sortField] || '').toLowerCase();
      const right = String(b[sortField] || '').toLowerCase();
      if (left === right) {
        return 0;
      }
      const comparison = left < right ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

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
  }, [cases, searchTerm, sortField, sortOrder]);
  

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
    >
      <PortalListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search cases by number, title, status, or type"
        sortValue={sortField}
        onSortChange={setSortField}
        sortOptions={[
          { value: 'updated_at', label: 'Recently updated' },
          { value: 'title', label: 'Title' },
          { value: 'status_name', label: 'Status' },
          { value: 'case_number', label: 'Case number' },
        ]}
        orderValue={sortOrder}
        onOrderChange={setSortOrder}
        showingCount={filteredCases.length}
        totalCount={cases.length}
      />
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
