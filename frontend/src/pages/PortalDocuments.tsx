import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';

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

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/documents');
      setDocuments(unwrapApiData(response.data));
    } catch (err) {
      console.error('Failed to load documents', err);
      setError('Unable to load documents right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Documents</h2>
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && documents.length === 0}
        loadingLabel="Loading documents..."
        emptyTitle="No documents available."
        emptyDescription="Only documents explicitly shared by staff will appear here."
        onRetry={load}
      />
      {!loading && !error && documents.length > 0 && (
        <ul className="mt-4 space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="p-3 border rounded-lg flex justify-between items-center">
              <div>
                <div className="font-medium text-app-text">{doc.title || doc.original_name}</div>
                <div className="text-sm text-app-text-muted">{doc.document_type}</div>
              </div>
              <a
                href={`/api/v2/portal/documents/${doc.id}/download`}
                className="text-sm text-app-accent hover:underline"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
