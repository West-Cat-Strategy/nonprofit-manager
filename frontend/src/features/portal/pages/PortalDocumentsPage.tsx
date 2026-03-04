import { useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import { portalV2ApiClient } from '../api/portalApiClient';
import usePortalDocumentsList from '../client/usePortalDocumentsList';
import type { PortalDocument } from '../types/contracts';

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function PortalDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'document_type' | 'original_name'>(
    'created_at'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const {
    items: documents,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
  } = usePortalDocumentsList({
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
  });

  return (
    <PortalPageShell
      title="Documents"
      description="Only documents explicitly shared by staff appear here."
    >
      <PortalListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search documents by title, type, or mime"
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
        showingCount={documents.length}
        totalCount={total}
      />
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && documents.length === 0}
        loadingLabel="Loading documents..."
        emptyTitle={searchTerm ? 'No matching documents.' : 'No documents available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Only documents explicitly shared by staff will appear here.'
        }
        onRetry={refresh}
      />
      {!loading && !error && documents.length > 0 && (
        <ul className="space-y-3">
          {documents.map((doc: PortalDocument) => (
            <li key={doc.id}>
              <PortalListCard
                title={doc.title || doc.original_name}
                subtitle={doc.document_type}
                meta={`Shared ${new Date(doc.created_at).toLocaleString()}`}
                badges={
                  <>
                    <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {formatFileSize(doc.file_size ?? 0)}
                    </span>
                    {doc.mime_type && (
                      <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                        {doc.mime_type}
                      </span>
                    )}
                  </>
                }
                actions={
                  <a
                    href={portalV2ApiClient.getDocumentDownloadUrl(doc.id)}
                    className="rounded border border-app-input-border px-2 py-1 text-xs"
                  >
                    Download
                  </a>
                }
              >
                {doc.description && <p className="text-sm text-app-text-muted">{doc.description}</p>}
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
            {loadingMore ? 'Loading more...' : 'Load more documents'}
          </button>
        </div>
      )}
    </PortalPageShell>
  );
}
