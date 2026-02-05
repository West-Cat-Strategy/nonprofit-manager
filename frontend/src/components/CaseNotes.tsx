import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createCaseNote } from '../store/slices/casesSlice';
import { useToast } from '../contexts/useToast';
import type { CreateCaseNoteDTO, NoteType } from '../types/case';

interface CaseNotesProps {
  caseId: string;
}

const CaseNotes = ({ caseId }: CaseNotesProps) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { caseNotes, loading } = useAppSelector((state) => state.cases);

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState<Partial<CreateCaseNoteDTO>>({
    case_id: caseId,
    note_type: 'note',
    subject: '',
    content: '',
    is_internal: false,
    is_important: false,
  });

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.content?.trim()) {
      showError('Please enter note content');
      return;
    }

    try {
      await dispatch(
        createCaseNote({
          case_id: caseId,
          note_type: newNote.note_type as NoteType,
          subject: newNote.subject,
          content: newNote.content,
          is_internal: newNote.is_internal,
          is_important: newNote.is_important,
        })
      ).unwrap();

      showSuccess('Note added successfully');
      // Reset form
      setNewNote({
        case_id: caseId,
        note_type: 'note',
        subject: '',
        content: '',
        is_internal: false,
        is_important: false,
      });
      setIsAddingNote(false);
    } catch (error) {
      console.error('Failed to add note:', error);
      showError('Failed to add note. Please try again.');
    }
  };

  const getNoteIcon = (noteType: NoteType) => {
    const icons: Record<NoteType, string> = {
      note: '📝',
      email: '📧',
      call: '📞',
      meeting: '🤝',
      update: '📢',
      status_change: '🔄',
    };
    return icons[noteType] || '📝';
  };

  const getNoteTypeLabel = (noteType: NoteType) => {
    const labels: Record<NoteType, string> = {
      note: 'Note',
      email: 'Email',
      call: 'Phone Call',
      meeting: 'Meeting',
      update: 'Update',
      status_change: 'Status Change',
    };
    return labels[noteType] || 'Note';
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
                setNewNote((prev) => ({ ...prev, note_type: e.target.value as NoteType }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="note">General Note</option>
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="meeting">Meeting</option>
              <option value="update">Update</option>
            </select>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={newNote.subject}
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
              <span className="text-sm text-gray-700">Internal note (not visible to client)</span>
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes Timeline */}
      <div className="space-y-4">
        {caseNotes.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-gray-400 text-4xl mb-2">📝</div>
            <p className="text-gray-600">No notes yet</p>
            <p className="text-sm text-gray-500 mt-1">Add your first note to start tracking activity</p>
          </div>
        )}

        {caseNotes.map((note) => (
          <div
            key={note.id}
            className={`bg-white rounded-lg border p-4 ${
              note.is_important ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
            }`}
          >
            {/* Note Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getNoteIcon(note.note_type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {getNoteTypeLabel(note.note_type)}
                    </span>
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
                    {note.first_name} {note.last_name} • {formatDate(note.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Subject */}
            {note.subject && (
              <div className="font-medium text-gray-900 mb-2">{note.subject}</div>
            )}

            {/* Note Content */}
            <div className="text-gray-700 whitespace-pre-wrap">{note.content}</div>

            {/* Status Change Info */}
            {note.note_type === 'status_change' && note.previous_status_id && note.new_status_id && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                Status changed: {note.previous_status_id} → {note.new_status_id}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CaseNotes;
