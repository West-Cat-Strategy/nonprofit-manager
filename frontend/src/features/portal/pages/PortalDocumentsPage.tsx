import { useEffect, useMemo, useState } from 'react';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { portalV2ApiClient } from '../../../features/portal/api/portalApiClient';

interface DocumentRow {
  id: string;
  original_name: string;
  document_type: string;
  title?: string | null;
  description?: string | null;
  file_size: number;
  mime_type: string;
  created_at: string;
}

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleDocuments = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...documents].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return sorted.filter((doc) => {
      if (!needle) {
        return true;
      }

      const haystack = [doc.title, doc.original_name, doc.document_type, doc.description, doc.mime_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [documents, searchTerm, sortOrder]);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/documents');
      setDocuments(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load documents', loadError);
      setError('Unable to load documents right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PortalPageShell
      title="Documents"
      description="Only documents explicitly shared by staff appear here."
      actions={
        <div className="flex flex-wrap gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search documents"
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          />
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
            className="rounded-md border border-app-input-border px-3 py-2 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      }
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && visibleDocuments.length === 0}
        loadingLabel="Loading documents..."
        emptyTitle={searchTerm ? 'No matching documents.' : 'No documents available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Only documents explicitly shared by staff will appear here.'
        }
        onRetry={load}
      />
      {!loading && !error && visibleDocuments.length > 0 && (
        <ul className="space-y-3">
          {visibleDocuments.map((doc) => (
            <li key={doc.id}>
              <PortalListCard
                title={doc.title || doc.original_name}
                subtitle={doc.document_type}
                meta={`Shared ${new Date(doc.created_at).toLocaleString()}`}
                badges={
                  <>
                    <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {formatFileSize(doc.file_size)}
                    </span>
                    <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                      {doc.mime_type}
                    </span>
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
    </PortalPageShell>
  );
}
