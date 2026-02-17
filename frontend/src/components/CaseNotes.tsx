import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createCaseNote } from '../store/slices/casesSlice';
import { useToast } from '../contexts/useToast';
import type { CreateCaseNoteDTO, NoteType } from '../types/case';
import { getNoteIcon, getNoteTypeLabel, formatNoteDate, NOTE_TYPE_OPTIONS } from '../utils/notes';

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

  return (
    <div className="space-y-6">
      {/* Add Note Button */}
      {!isAddingNote && (
        <button
          onClick={() => setIsAddingNote(true)}
          className="w-full px-4 py-3 bg-app-accent-soft text-app-accent rounded-lg hover:bg-app-accent-soft transition border border-app-accent-soft"
        >
          + Add Note
        </button>
      )}

      {/* Add Note Form */}
      {isAddingNote && (
        <form onSubmit={handleSubmitNote} className="bg-app-surface rounded-lg border border-app-border p-4">
          <h3 className="text-lg font-semibold mb-4">Add Note</h3>

          {/* Note Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-text-muted mb-2">Note Type</label>
            <select
              value={newNote.note_type}
              onChange={(e) =>
                setNewNote((prev) => ({ ...prev, note_type: e.target.value as NoteType }))
              }
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            >
              {NOTE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-text-muted mb-2">Subject</label>
            <input
              type="text"
              value={newNote.subject}
              onChange={(e) => setNewNote((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief summary (optional)"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-text-muted mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))}
              rows={4}
              required
              placeholder="Enter note details..."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          {/* Checkboxes */}
          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_internal}
                onChange={(e) => setNewNote((prev) => ({ ...prev, is_internal: e.target.checked }))}
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Internal note (not visible to client)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_important}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, is_important: e.target.checked }))
                }
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Mark as important</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="px-4 py-2 border border-app-input-border rounded-lg hover:bg-app-surface-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </form>
      )}

      {/* Notes Timeline */}
      <div className="space-y-4">
        {caseNotes.length === 0 && (
          <div className="text-center py-12 bg-app-surface-muted rounded-lg">
            <div className="text-app-text-subtle text-4xl mb-2">📝</div>
            <p className="text-app-text-muted">No notes yet</p>
            <p className="text-sm text-app-text-muted mt-1">Add your first note to start tracking activity</p>
          </div>
        )}

        {caseNotes.map((note) => (
          <div
            key={note.id}
            className={`bg-app-surface rounded-lg border p-4 ${
              note.is_important ? 'border-yellow-300 bg-yellow-50' : 'border-app-border'
            }`}
          >
            {/* Note Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getNoteIcon(note.note_type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-app-text">
                      {getNoteTypeLabel(note.note_type)}
                    </span>
                    {note.is_internal && (
                      <span className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded">
                        Internal
                      </span>
                    )}
                    {note.is_important && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Important
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-app-text-muted">
                    {note.first_name} {note.last_name} • {formatNoteDate(note.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Note Subject */}
            {note.subject && (
              <div className="font-medium text-app-text mb-2">{note.subject}</div>
            )}

            {/* Note Content */}
            <div className="text-app-text-muted whitespace-pre-wrap">{note.content}</div>

            {/* Status Change Info */}
            {note.note_type === 'status_change' && note.previous_status_id && note.new_status_id && (
              <div className="mt-3 pt-3 border-t border-app-border text-sm text-app-text-muted">
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
