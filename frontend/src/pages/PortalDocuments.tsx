import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';

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

  useEffect(() => {
    const load = async () => {
      try {
        const response = await portalApi.get('/portal/documents');
        setDocuments(response.data);
      } catch (error) {
        console.error('Failed to load documents', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
      {loading ? (
        <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-500 mt-2">No documents available.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="p-3 border rounded-lg flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-900">{doc.title || doc.original_name}</div>
                <div className="text-sm text-gray-500">{doc.document_type}</div>
              </div>
              <a
                href={`/api/portal/documents/${doc.id}/download`}
                className="text-sm text-blue-600 hover:underline"
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
