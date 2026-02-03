import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchContactNotes,
  createContactNote,
  deleteContactNote,
} from '../store/slices/contactsSlice';
import { fetchCases, selectCasesByContact } from '../store/slices/casesSlice';
import type { CreateContactNoteDTO, ContactNoteType } from '../types/contact';
import { NOTE_TYPES } from '../types/contact';

interface ContactNotesProps {
  contactId: string;
}

const ContactNotes = ({ contactId }: ContactNotesProps) => {
  const dispatch = useAppDispatch();
  const { contactNotes, notesLoading } = useAppSelector((state) => state.contacts);
  const contactCases = useAppSelector((state) => selectCasesByContact(state, contactId));

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState<CreateContactNoteDTO>({
    note_type: 'note',
    subject: '',
    content: '',
    is_internal: false,
    is_important: false,
    is_pinned: false,
    case_id: undefined,
  });

  useEffect(() => {
    dispatch(fetchContactNotes(contactId));
    // Fetch cases for the case selector dropdown
    dispatch(fetchCases({}));
  }, [dispatch, contactId]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.content?.trim()) {
      alert('Please enter note content');
      return;
    }

    try {
      await dispatch(
        createContactNote({
          contactId,
          data: newNote,
        })
      ).unwrap();

      // Reset form
      setNewNote({
        note_type: 'note',
        subject: '',
        content: '',
        is_internal: false,
        is_important: false,
        is_pinned: false,
        case_id: undefined,
      });
      setIsAddingNote(false);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await dispatch(deleteContactNote(noteId)).unwrap();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const getNoteIcon = (noteType: ContactNoteType) => {
    const icons: Record<ContactNoteType, string> = {
      note: '📝',
      email: '📧',
      call: '📞',
      meeting: '🤝',
      update: '📢',
      other: '📌',
    };
    return icons[noteType] || '📝';
  };

  const getNoteTypeLabel = (noteType: ContactNoteType) => {
    const found = NOTE_TYPES.find((t) => t.value === noteType);
    return found?.label || 'Note';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Sort notes: pinned first, then by date
  const sortedNotes = [...contactNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Add Note Button */}
      {!isAddingNote && (
        <button
          onClick={() => setIsAddingNote(true)}
          className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200"
        >
          + Add Note
        </button>
      )}

      {/* Add Note Form */}
      {isAddingNote && (
        <form onSubmit={handleSubmitNote} className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Add Note</h3>

          {/* Note Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
            <select
              value={newNote.note_type}
              onChange={(e) =>
                setNewNote((prev) => ({ ...prev, note_type: e.target.value as ContactNoteType }))
              }
              title="Select note type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {NOTE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Case Association */}
          {contactCases.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Associate with Case (Optional)
              </label>
              <select
                value={newNote.case_id || ''}
                onChange={(e) =>
                  setNewNote((prev) => ({
                    ...prev,
                    case_id: e.target.value || undefined,
                  }))
                }
                title="Select case to associate with this note"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No case (general note)</option>
                {contactCases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_number} - {caseItem.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Link this note to a specific case for this person
              </p>
            </div>
          )}

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={newNote.subject || ''}
              onChange={(e) => setNewNote((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief summary (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))}
              rows={4}
              required
              placeholder="Enter note details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Checkboxes */}
          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_internal}
                onChange={(e) => setNewNote((prev) => ({ ...prev, is_internal: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Internal note (staff only)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_important}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, is_important: e.target.checked }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mark as important</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_pinned}
                onChange={(e) => setNewNote((prev) => ({ ...prev, is_pinned: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Pin to top</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={notesLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {notesLoading ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes Timeline */}
      <div className="space-y-4">
        {notesLoading && contactNotes.length === 0 && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading notes...</p>
          </div>
        )}

        {!notesLoading && contactNotes.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-4xl mb-2">📝</div>
            <p className="text-gray-600">No notes yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add your first note to start tracking activity
            </p>
          </div>
        )}

        {sortedNotes.map((note) => (
          <div
            key={note.id}
            className={`bg-white rounded-lg border p-4 ${
              note.is_important
                ? 'border-yellow-300 bg-yellow-50'
                : note.is_pinned
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            {/* Note Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getNoteIcon(note.note_type)}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {getNoteTypeLabel(note.note_type)}
                    </span>
                    {note.is_pinned && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Pinned
                      </span>
                    )}
                    {note.is_internal && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        Internal
                      </span>
                    )}
                    {note.is_important && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Important
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {note.created_by_first_name} {note.created_by_last_name} •{' '}
                    {formatDate(note.created_at)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="text-gray-400 hover:text-red-500 transition"
                title="Delete note"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            {/* Note Subject */}
            {note.subject && <div className="font-medium text-gray-900 mb-2">{note.subject}</div>}

            {/* Note Content */}
            <div className="text-gray-700 whitespace-pre-wrap">{note.content}</div>

            {/* Case Association */}
            {note.case_id && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                <span className="text-gray-500">Associated with case: </span>
                <Link
                  to={`/cases/${note.case_id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {note.case_number || note.case_title || 'View Case'}
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactNotes;
