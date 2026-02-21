import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';
import { unwrapApiData } from '../services/apiEnvelope';
import PortalPageState from '../components/portal/PortalPageState';

interface NoteRow {
  id: string;
  note_type: string;
  subject?: string | null;
  content: string;
  created_at: string;
}

export default function PortalNotes() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await portalApi.get('/v2/portal/notes');
      setNotes(unwrapApiData(response.data));
    } catch (err) {
      console.error('Failed to load notes', err);
      setError('Unable to load notes right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-app-text">Notes</h2>
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && notes.length === 0}
        loadingLabel="Loading notes..."
        emptyTitle="No notes available."
        emptyDescription="Staff must explicitly share notes to make them visible here."
        onRetry={load}
      />
      {!loading && !error && notes.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="p-3 border rounded-lg">
              <div className="text-sm text-app-text-muted uppercase">{note.note_type}</div>
              {note.subject && <div className="font-medium text-app-text">{note.subject}</div>}
              <p className="text-sm text-app-text-muted mt-1">{note.content}</p>
              <div className="text-xs text-app-text-subtle mt-2">
                {new Date(note.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
