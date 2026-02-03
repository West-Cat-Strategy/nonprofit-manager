import { useEffect, useState } from 'react';
import portalApi from '../services/portalApi';

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

  useEffect(() => {
    const load = async () => {
      try {
        const response = await portalApi.get('/portal/notes');
        setNotes(response.data);
      } catch (error) {
        console.error('Failed to load notes', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
      {loading ? (
        <p className="text-sm text-gray-500 mt-2">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-500 mt-2">No notes available.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="p-3 border rounded-lg">
              <div className="text-sm text-gray-500 uppercase">{note.note_type}</div>
              {note.subject && <div className="font-medium text-gray-900">{note.subject}</div>}
              <p className="text-sm text-gray-700 mt-1">{note.content}</p>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(note.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
