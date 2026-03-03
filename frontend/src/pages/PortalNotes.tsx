import { useEffect, useMemo, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';
import PortalPageShell from '../components/portal/PortalPageShell';
import PortalListCard from '../components/portal/PortalListCard';

interface NoteRow {
  id: string;
  note_type: string;
  subject?: string | null;
  content: string;
  created_at: string;
}

export default function PortalNotes() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visibleNotes = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return sorted.filter((note) => {
      if (!needle) {
        return true;
      }

      const haystack = [note.note_type, note.subject, note.content].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [notes, searchTerm, sortOrder]);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/notes');
      setNotes(unwrapApiData(response.data));
    } catch (loadError) {
      console.error('Failed to load notes', loadError);
      setError('Unable to load notes right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PortalPageShell
      title="Notes"
      description="Read notes that staff have shared with your portal account."
      actions={
        <div className="flex flex-wrap gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search notes"
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
        empty={!loading && !error && visibleNotes.length === 0}
        loadingLabel="Loading notes..."
        emptyTitle={searchTerm ? 'No matching notes.' : 'No notes available.'}
        emptyDescription={
          searchTerm
            ? 'Try a different search term.'
            : 'Staff must explicitly share notes to make them visible here.'
        }
        onRetry={load}
      />
      {!loading && !error && visibleNotes.length > 0 && (
        <ul className="space-y-3">
          {visibleNotes.map((note) => (
            <li key={note.id}>
              <PortalListCard
                title={note.subject || note.note_type}
                subtitle={note.note_type.toUpperCase()}
                meta={new Date(note.created_at).toLocaleString()}
              >
                <p className="whitespace-pre-wrap text-sm text-app-text-muted">{note.content}</p>
              </PortalListCard>
            </li>
          ))}
        </ul>
      )}
    </PortalPageShell>
  );
}
