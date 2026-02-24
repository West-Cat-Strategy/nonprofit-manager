import { useCallback, useEffect, useMemo, useState } from 'react';
import { casesApiClient } from '../features/cases/api/casesApiClient';
import { useToast } from '../contexts/useToast';
import type { CaseNote, CreateCaseNoteDTO, NoteType, UpdateCaseNoteDTO } from '../types/case';
import { formatNoteDate, getNoteIcon, getNoteTypeLabel } from '../utils/notes';

interface CaseNotesProps {
  caseId: string;
  onChanged?: () => void;
}

const NOTE_TYPE_OPTIONS: Array<{ value: NoteType; label: string }> = [
  { value: 'note', label: 'General Note' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'update', label: 'Update' },
  { value: 'status_change', label: 'Status Change' },
];

type NoteDraft = {
  note_type: NoteType;
  subject: string;
  category: string;
  content: string;
  visible_to_client: boolean;
  is_important: boolean;
};

const emptyDraft = (): NoteDraft => ({
  note_type: 'note',
  subject: '',
  category: '',
  content: '',
  visible_to_client: false,
  is_important: false,
});

const normalizeDraftForCreate = (caseId: string, draft: NoteDraft): CreateCaseNoteDTO => ({
  case_id: caseId,
  note_type: draft.note_type,
  subject: draft.subject.trim() || undefined,
  category: draft.category.trim() || undefined,
  content: draft.content,
  visible_to_client: draft.visible_to_client,
  is_internal: !draft.visible_to_client,
  is_important: draft.is_important,
});

const normalizeDraftForUpdate = (draft: NoteDraft): UpdateCaseNoteDTO => ({
  note_type: draft.note_type,
  subject: draft.subject.trim() || undefined,
  category: draft.category.trim() || undefined,
  content: draft.content,
  visible_to_client: draft.visible_to_client,
  is_internal: !draft.visible_to_client,
  is_important: draft.is_important,
});

const noteToDraft = (note: CaseNote): NoteDraft => ({
  note_type: note.note_type,
  subject: note.subject || '',
  category: note.category || '',
  content: note.content,
  visible_to_client: Boolean(note.visible_to_client),
  is_important: Boolean(note.is_important),
});

const CaseNotes = ({ caseId, onChanged }: CaseNotesProps) => {
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(emptyDraft);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<NoteDraft>(emptyDraft);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await casesApiClient.listCaseNotes(caseId);
      setNotes(response.notes || []);
    } catch {
      showError('Failed to load case notes');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const hasNotes = useMemo(() => notes.length > 0, [notes]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.content.trim()) {
      showError('Note content is required');
      return;
    }

    try {
      setSaving(true);
      await casesApiClient.createCaseNote(normalizeDraftForCreate(caseId, draft));
      setDraft(emptyDraft());
      setIsAdding(false);
      await loadNotes();
      onChanged?.();
      showSuccess('Case note added');
    } catch {
      showError('Failed to add case note');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: CaseNote) => {
    setEditingNoteId(note.id);
    setEditingDraft(noteToDraft(note));
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId) return;
    if (!editingDraft.content.trim()) {
      showError('Note content is required');
      return;
    }

    try {
      setSaving(true);
      await casesApiClient.updateCaseNote(editingNoteId, normalizeDraftForUpdate(editingDraft));
      setEditingNoteId(null);
      setEditingDraft(emptyDraft());
      await loadNotes();
      onChanged?.();
      showSuccess('Case note updated');
    } catch {
      showError('Failed to update case note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) return;

    try {
      setSaving(true);
      await casesApiClient.deleteCaseNote(noteId);
      await loadNotes();
      onChanged?.();
      showSuccess('Case note deleted');
    } catch {
      showError('Failed to delete case note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full rounded-lg border border-app-border bg-app-surface-muted px-4 py-3 text-sm font-semibold text-app-text hover:bg-app-surface-muted/70"
        >
          + Add Note
        </button>
      )}

      {isAdding && (
        <form onSubmit={handleCreate} className="rounded-lg border border-app-border bg-app-surface p-4">
          <h3 className="mb-3 text-base font-semibold text-app-text">New Note</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-app-text-muted">Type</span>
              <select
                value={draft.note_type}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, note_type: event.target.value as NoteType }))
                }
                className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
              >
                {NOTE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-app-text-muted">Category</span>
              <input
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                placeholder="Optional category"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-app-text-muted">Subject</span>
            <input
              value={draft.subject}
              onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
              placeholder="Optional subject"
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-app-text-muted">Content</span>
            <textarea
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
              rows={5}
              required
              placeholder="Write note details (plain text or markdown)"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
              <input
                type="checkbox"
                checked={draft.visible_to_client}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, visible_to_client: event.target.checked }))
                }
                className="rounded border-app-input-border"
              />
              Visible to client
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
              <input
                type="checkbox"
                checked={draft.is_important}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, is_important: event.target.checked }))
                }
                className="rounded border-app-input-border"
              />
              Important
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setDraft(emptyDraft());
              }}
              className="rounded border border-app-input-border px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-app-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-app-text-muted">Loading notes...</p>}

      {!loading && !hasNotes && (
        <div className="rounded-lg border border-app-border bg-app-surface-muted p-8 text-center">
          <p className="text-sm text-app-text-muted">No notes yet.</p>
        </div>
      )}

      {!loading &&
        notes.map((note) => {
          const isEditing = editingNoteId === note.id;
          return (
            <div key={note.id} className="rounded-lg border border-app-border bg-app-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getNoteIcon(note.note_type)}</span>
                    <span className="text-sm font-semibold text-app-text">
                      {getNoteTypeLabel(note.note_type)}
                    </span>
                    {note.visible_to_client ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        Client visible
                      </span>
                    ) : (
                      <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                        Internal
                      </span>
                    )}
                    {note.is_important && (
                      <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                        Important
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-app-text-muted">
                    {note.first_name || 'Staff'} {note.last_name || ''} · {formatNoteDate(note.created_at)}
                  </p>
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(note)}
                      className="rounded border border-app-input-border px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(note.id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-app-text-muted">Type</span>
                      <select
                        value={editingDraft.note_type}
                        onChange={(event) =>
                          setEditingDraft((current) => ({
                            ...current,
                            note_type: event.target.value as NoteType,
                          }))
                        }
                        className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                      >
                        {NOTE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-app-text-muted">Category</span>
                      <input
                        value={editingDraft.category}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, category: event.target.value }))
                        }
                        className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block text-app-text-muted">Subject</span>
                    <input
                      value={editingDraft.subject}
                      onChange={(event) =>
                        setEditingDraft((current) => ({ ...current, subject: event.target.value }))
                      }
                      className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-app-text-muted">Content</span>
                    <textarea
                      value={editingDraft.content}
                      onChange={(event) =>
                        setEditingDraft((current) => ({ ...current, content: event.target.value }))
                      }
                      className="w-full rounded border border-app-input-border px-3 py-2 text-sm"
                      rows={4}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                      <input
                        type="checkbox"
                        checked={editingDraft.visible_to_client}
                        onChange={(event) =>
                          setEditingDraft((current) => ({
                            ...current,
                            visible_to_client: event.target.checked,
                          }))
                        }
                        className="rounded border-app-input-border"
                      />
                      Visible to client
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                      <input
                        type="checkbox"
                        checked={editingDraft.is_important}
                        onChange={(event) =>
                          setEditingDraft((current) => ({ ...current, is_important: event.target.checked }))
                        }
                        className="rounded border-app-input-border"
                      />
                      Important
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditingDraft(emptyDraft());
                      }}
                      className="rounded border border-app-input-border px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveEdit()}
                      className="rounded bg-app-accent px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {note.subject && <p className="mb-1 text-sm font-medium text-app-text">{note.subject}</p>}
                  {note.category && <p className="mb-2 text-xs text-app-text-muted">Category: {note.category}</p>}
                  <p className="whitespace-pre-wrap text-sm text-app-text">{note.content}</p>
                </>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default CaseNotes;

