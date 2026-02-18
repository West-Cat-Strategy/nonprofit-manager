import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import PortalPageState from '../components/portal/PortalPageState';

interface FormDoc {
  id: string;
  original_name: string;
  document_type: string;
  title?: string | null;
  description?: string | null;
  created_at: string;
}

export default function PortalForms() {
  const [forms, setForms] = useState<FormDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/portal/forms');
      setForms(response.data);
    } catch (err) {
      console.error('Failed to load forms', err);
      setError('Unable to load forms right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Forms</h2>
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && forms.length === 0}
        loadingLabel="Loading forms..."
        emptyTitle="No forms available."
        emptyDescription="Assigned forms will appear here when they are published."
        onRetry={load}
      />
      {!loading && !error && forms.length > 0 && (
        <ul className="mt-4 space-y-3">
          {forms.map((form) => (
            <li key={form.id} className="p-3 border rounded-lg flex justify-between items-center">
              <div>
                <div className="font-medium text-app-text">{form.title || form.original_name}</div>
                <div className="text-sm text-app-text-muted">{form.document_type}</div>
              </div>
              <a
                href={`/api/portal/documents/${form.id}/download`}
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
