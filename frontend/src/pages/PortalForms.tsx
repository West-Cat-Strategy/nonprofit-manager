import { useEffect, useMemo, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';
import PortalPageShell from '../components/portal/PortalPageShell';
import PortalListCard from '../components/portal/PortalListCard';
import { portalV2ApiClient } from '../features/portal/api/portalApiClient';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleForms = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...forms].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return sorted.filter((form) => {
      if (!needle) {
        return true;
      }

      const haystack = [form.title, form.original_name, form.document_type, form.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [forms, searchTerm, sortOrder]);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/forms');
      setForms(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load forms', loadError);
      setError('Unable to load forms right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PortalPageShell
      title="Forms"
      description="Download forms that staff have shared with you."
      actions={
        <div className="flex flex-wrap gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search forms"
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
        empty={!loading && !error && visibleForms.length === 0}
        loadingLabel="Loading forms..."
        emptyTitle={searchTerm ? 'No matching forms.' : 'No forms available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Forms appear only when staff explicitly share them with you.'
        }
        onRetry={load}
      />
      {!loading && !error && visibleForms.length > 0 && (
        <ul className="space-y-3">
          {visibleForms.map((form) => (
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
    </PortalPageShell>
  );
}
