import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchContactNotes,
  createContactNote,
  deleteContactNote,
  updateContactNote,
} from '../store/slices/contactsSlice';
import { fetchCases, selectCasesByContact } from '../store/slices/casesSlice';
import { useToast } from '../contexts/useToast';
import type { CreateContactNoteDTO, UpdateContactNoteDTO, ContactNoteType } from '../types/contact';
import { NOTE_TYPES } from '../types/contact';
import { getNoteIcon, getNoteTypeLabel, formatNoteDate } from '../utils/notes';
import useConfirmDialog, { confirmPresets } from '../hooks/useConfirmDialog';
import ConfirmDialog from './ConfirmDialog';

interface ContactNotesProps {
  contactId: string;
  openOnMount?: boolean;
  onOpenHandled?: () => void;
}

const ContactNotes = ({ contactId, openOnMount = false, onOpenHandled }: ContactNotesProps) => {
  const dispatch = useAppDispatch();
  const { contactNotes, notesLoading } = useAppSelector((state) => state.contacts);
  const contactCases = useAppSelector((state) => selectCasesByContact(state, contactId));
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [submitMode, setSubmitMode] = useState<'close' | 'another'>('close');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactNoteType | 'all'>('all');
  const [newNote, setNewNote] = useState<CreateContactNoteDTO>({
    note_type: 'note',
    subject: '',
    content: '',
    is_internal: false,
    is_important: false,
    is_pinned: false,
    is_alert: false,
    case_id: undefined,
  });

  useEffect(() => {
    dispatch(fetchContactNotes(contactId));
    // Fetch cases for the case selector dropdown
    dispatch(fetchCases({}));
  }, [dispatch, contactId]);

  useEffect(() => {
    if (openOnMount) {
      setIsAddingNote(true);
      onOpenHandled?.();
    }
  }, [openOnMount, onOpenHandled]);

  const noteTemplates: Array<{
    label: string;
    note_type: ContactNoteType;
    subject: string;
    content: string;
  }> = [
    { label: 'Call', note_type: 'call', subject: 'Phone call', content: '' },
    { label: 'Email', note_type: 'email', subject: 'Email sent', content: '' },
    { label: 'Meeting', note_type: 'meeting', subject: 'Meeting notes', content: '' },
    { label: 'Update', note_type: 'update', subject: 'Status update', content: '' },
  ];

  const applyTemplate = (template: (typeof noteTemplates)[number]) => {
    setIsAddingNote(true);
    setNewNote((prev) => ({
      ...prev,
      note_type: template.note_type,
      subject: template.subject,
      content: template.content,
    }));
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.content?.trim()) {
      showError('Please enter note content');
      return;
    }

    try {
      await dispatch(
        createContactNote({
          contactId,
          data: newNote,
        })
      ).unwrap();

      showSuccess('Note added successfully');
      // Reset form
      setNewNote({
        note_type: 'note',
        subject: '',
        content: '',
        is_internal: false,
        is_important: false,
        is_pinned: false,
        is_alert: false,
        case_id: undefined,
      });
      setIsAddingNote(submitMode === 'another');
      setSubmitMode('close');
    } catch (error) {
      console.error('Failed to add note:', error);
      showError('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = await confirm(confirmPresets.delete('Note'));
    if (!confirmed) return;

    try {
      await dispatch(deleteContactNote(noteId)).unwrap();
      showSuccess('Note deleted');
    } catch (error) {
      console.error('Failed to delete note:', error);
      showError('Failed to delete note');
    }
  };

  const handleToggleFlag = async (noteId: string, updates: Partial<UpdateContactNoteDTO>) => {
    try {
      await dispatch(updateContactNote({ noteId, data: updates })).unwrap();
      showSuccess('Note updated');
    } catch (error) {
      console.error('Failed to update note:', error);
      showError('Failed to update note');
    }
  };

  // Sort notes: pinned first, then alerts, then by date
  const sortedNotes = [...contactNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (a.is_alert && !b.is_alert) return -1;
    if (!a.is_alert && b.is_alert) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredNotes = sortedNotes.filter((note) => {
    if (typeFilter !== 'all' && note.note_type !== typeFilter) return false;
    if (!searchTerm.trim()) return true;
    const haystack = `${note.subject || ''} ${note.content || ''}`.toLowerCase();
    return haystack.includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Quick Templates */}
      <div className="flex flex-wrap gap-2">
        {noteTemplates.map((template) => (
          <button
            key={template.label}
            onClick={() => applyTemplate(template)}
            className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-app-surface hover:bg-[var(--loop-yellow)] transition"
          >
            + {template.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 px-3 py-2 border-2 border-black text-sm font-bold"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContactNoteType | 'all')}
          className="px-3 py-2 border-2 border-black text-sm font-bold"
        >
          <option value="all">All Types</option>
          {NOTE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Add Note Button */}
      {!isAddingNote && (
        <button
          onClick={() => setIsAddingNote(true)}
          className="w-full px-4 py-3 bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft-hover transition border border-app-accent"
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
            <label className="block text-sm font-medium text-app-text-label mb-2">Note Type</label>
            <select
              value={newNote.note_type}
              onChange={(e) =>
                setNewNote((prev) => ({ ...prev, note_type: e.target.value as ContactNoteType }))
              }
              title="Select note type"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
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
              <label className="block text-sm font-medium text-app-text-label mb-2">
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
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
              >
                <option value="">No case (general note)</option>
                {contactCases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_number} - {caseItem.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-app-text-muted">
                Link this note to a specific case for this person
              </p>
            </div>
          )}

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-text-label mb-2">Subject</label>
            <input
              type="text"
              value={newNote.subject || ''}
              onChange={(e) => setNewNote((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief summary (optional)"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-text-label mb-2">
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
              <span className="text-sm text-app-text-muted">Internal note (staff only)</span>
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_pinned}
                onChange={(e) => setNewNote((prev) => ({ ...prev, is_pinned: e.target.checked }))}
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Pin to top</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_alert}
                onChange={(e) => setNewNote((prev) => ({ ...prev, is_alert: e.target.checked }))}
                className="rounded border-app-input-border text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-app-text-muted">Mark as alert (shows popup when viewing contact)</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddingNote(false)}
              className="px-4 py-2 border border-app-input-border rounded-lg hover:bg-app-hover transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={notesLoading}
              onClick={() => setSubmitMode('another')}
              className="px-4 py-2 border-2 border-black bg-app-surface text-black font-semibold rounded-lg hover:bg-app-hover disabled:opacity-50 transition"
            >
              Save & Add Another
            </button>
            <button
              type="submit"
              disabled={notesLoading}
              onClick={() => setSubmitMode('close')}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50 transition"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent mx-auto"></div>
            <p className="text-app-text-muted mt-2">Loading notes...</p>
          </div>
        )}

        {!notesLoading && contactNotes.length === 0 && (
          <div className="text-center py-12 bg-app-surface-muted rounded-lg">
            <div className="text-app-text-subtle text-4xl mb-2">📝</div>
            <p className="text-app-text-muted">No notes yet</p>
            <p className="text-sm text-app-text-muted mt-1">
              Add your first note to start tracking activity
            </p>
          </div>
        )}

        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`bg-app-surface rounded-lg border p-4 ${
              note.is_alert
                ? 'border-red-300 bg-red-50'
                : note.is_important
                ? 'border-yellow-300 bg-yellow-50'
                : note.is_pinned
                ? 'border-app-accent bg-app-accent-soft'
                : 'border-app-border'
            }`}
          >
            {/* Note Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getNoteIcon(note.note_type)}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-app-text">
                      {getNoteTypeLabel(note.note_type)}
                    </span>
                    {note.is_pinned && (
                      <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded">
                        Pinned
                      </span>
                    )}
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
                    {note.is_alert && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded font-semibold">
                        Alert
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-app-text-muted">
                    {note.created_by_first_name} {note.created_by_last_name} •{' '}
                    {formatNoteDate(note.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFlag(note.id, { is_pinned: !note.is_pinned })}
                  className={`text-xs font-bold uppercase px-2 py-1 border rounded ${
                    note.is_pinned ? 'border-app-accent text-app-accent-text' : 'border-app-input-border text-app-text-muted'
                  }`}
                  title="Toggle pin"
                >
                  Pin
                </button>
                <button
                  onClick={() => handleToggleFlag(note.id, { is_important: !note.is_important })}
                  className={`text-xs font-bold uppercase px-2 py-1 border rounded ${
                    note.is_important ? 'border-yellow-400 text-yellow-700' : 'border-app-input-border text-app-text-muted'
                  }`}
                  title="Toggle important"
                >
                  Important
                </button>
                <button
                  onClick={() => handleToggleFlag(note.id, { is_alert: !note.is_alert })}
                  className={`text-xs font-bold uppercase px-2 py-1 border rounded ${
                    note.is_alert ? 'border-red-400 text-red-700' : 'border-app-input-border text-app-text-muted'
                  }`}
                  title="Toggle alert"
                >
                  Alert
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-app-text-subtle hover:text-red-500 transition"
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
            </div>

            {/* Note Subject */}
            {note.subject && <div className="font-medium text-app-text mb-2">{note.subject}</div>}

            {/* Note Content */}
            <div className="text-app-text-muted whitespace-pre-wrap">{note.content}</div>

            {/* Case Association */}
            {note.case_id && (
              <div className="mt-3 pt-3 border-t border-app-border text-sm">
                <span className="text-app-text-muted">Associated with case: </span>
                <Link
                  to={`/cases/${note.case_id}`}
                  className="text-app-accent hover:text-app-accent-hover font-medium"
                >
                  {note.case_number || note.case_title || 'View Case'}
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        {...dialogState}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ContactNotes;
