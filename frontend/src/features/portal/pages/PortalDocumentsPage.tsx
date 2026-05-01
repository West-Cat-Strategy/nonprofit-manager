import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import PortalListToolbar from '../../../components/portal/PortalListToolbar';
import { portalV2ApiClient } from '../api/portalApiClient';
import usePortalDocumentsList from '../client/usePortalDocumentsList';
import type { PortalDocument } from '../types/contracts';
import { formatPortalDateTime } from '../utils/dateDisplay';
import { usePortalListUrlState } from '../utils/listQueryState';

const DOCUMENT_SORT_VALUES = [
  'created_at',
  'title',
  'document_type',
  'original_name',
] as const;

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFileType = (value?: string | null): string | null => {
  if (!value) return null;
  const [, subtype = value] = value.split('/');
  return subtype.replace(/[-+.]/g, ' ').toUpperCase();
};

const documentActionClass =
  'inline-flex items-center gap-1.5 rounded border border-app-input-border px-2 py-1 text-xs transition-colors duration-150 hover:border-app-accent hover:bg-app-surface-muted';

export default function PortalDocuments() {
  const {
    search: searchTerm,
    sort: sortField,
    order: sortOrder,
    setSearch,
    setSort,
    setOrder,
  } = usePortalListUrlState({
    sortValues: DOCUMENT_SORT_VALUES,
    defaultSort: 'created_at',
    defaultOrder: 'desc',
  });
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
  const shouldShowListTools = documents.length > 0 || searchTerm.trim().length > 0;

  return (
    <PortalPageShell
      title="Documents"
      description="Only documents explicitly shared by staff appear here."
    >
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
        emptyIcon={<DocumentTextIcon className="h-5 w-5" aria-hidden="true" />}
        onRetry={refresh}
      />
      {shouldShowListTools && (
        <PortalListToolbar
          searchValue={searchTerm}
          onSearchChange={setSearch}
          searchPlaceholder="Search documents by title, type, or file format"
          sortValue={sortField}
          onSortChange={setSort}
          sortOptions={[
            { value: 'created_at', label: 'Shared date' },
            { value: 'title', label: 'Title' },
            { value: 'document_type', label: 'Type' },
            { value: 'original_name', label: 'Original file name' },
          ]}
          orderValue={sortOrder}
          onOrderChange={setOrder}
          showingCount={documents.length}
          totalCount={total}
        />
      )}
      {!loading && !error && documents.length > 0 && (
        <ul className="mt-3 space-y-3">
          {documents.map((doc: PortalDocument) => (
            <li key={doc.id}>
              <PortalListCard
                icon={<DocumentTextIcon className="h-5 w-5" aria-hidden="true" />}
                title={doc.title || doc.original_name}
                subtitle={doc.document_type}
                meta={`Shared ${formatPortalDateTime(doc.created_at)}`}
                badges={
                  <>
                    <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {formatFileSize(doc.file_size ?? 0)}
                    </span>
                    {formatFileType(doc.mime_type) && (
                      <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                        {formatFileType(doc.mime_type)}
                      </span>
                    )}
                  </>
                }
                actions={
                  <a
                    href={portalV2ApiClient.getDocumentDownloadUrl(doc.id)}
                    className={documentActionClass}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
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
