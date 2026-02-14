import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';

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

  useEffect(() => {
    const load = async () => {
      try {
        const response = await portalApi.get('/portal/forms');
        setForms(response.data);
      } catch (error) {
        console.error('Failed to load forms', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Forms</h2>
      {loading ? (
        <p className="text-sm text-app-text-muted mt-2">Loading forms...</p>
      ) : forms.length === 0 ? (
        <p className="text-sm text-app-text-muted mt-2">No forms available.</p>
      ) : (
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
