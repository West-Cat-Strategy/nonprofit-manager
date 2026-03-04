import { useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import { portalV2ApiClient } from '../api/portalApiClient';
import usePortalFormsList from '../client/usePortalFormsList';
import type { PortalDocument } from '../types/contracts';

export default function PortalForms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'document_type' | 'original_name'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const {
    items: forms,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = usePortalFormsList({
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
  });

  return (
    <PortalPageShell
      title="Forms"
      description="Download forms that staff have shared with you."
    >
      <PortalListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search forms by name or type"
        sortValue={sortField}
        onSortChange={setSortField}
        sortOptions={[
          { value: 'created_at', label: 'Shared date' },
          { value: 'title', label: 'Title' },
          { value: 'document_type', label: 'Type' },
          { value: 'original_name', label: 'Original file name' },
        ]}
        orderValue={sortOrder}
        onOrderChange={setSortOrder}
        showingCount={forms.length}
        totalCount={total}
      />
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && forms.length === 0}
        loadingLabel="Loading forms..."
        emptyTitle={searchTerm ? 'No matching forms.' : 'No forms available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Forms appear only when staff explicitly share them with you.'
        }
        onRetry={refresh}
      />
      {!loading && !error && forms.length > 0 && (
        <ul className="space-y-3">
          {forms.map((form: PortalDocument) => (
            <li key={form.id}>
              <PortalListCard
                title={form.title || form.original_name}
                subtitle={form.document_type}
                meta={`Shared ${new Date(form.created_at).toLocaleString()}`}
                actions={
                  <a
                    href={portalV2ApiClient.getDocumentDownloadUrl(form.id)}
                    className="rounded border border-app-input-border px-2 py-1 text-xs"
                  >
                    Download
                  </a>
                }
              >
                {form.description && <p className="text-sm text-app-text-muted">{form.description}</p>}
              </PortalListCard>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && hasMore && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="rounded-md border border-app-input-border px-4 py-2 text-sm font-medium text-app-text disabled:opacity-60"
          >
            {loadingMore ? 'Loading more...' : 'Load more forms'}
          </button>
        </div>
      )}
    </PortalPageShell>
  );
}
