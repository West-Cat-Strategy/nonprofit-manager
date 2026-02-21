import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createCaseNote,
  fetchCaseOutcomeDefinitions,
  fetchInteractionOutcomes,
  saveInteractionOutcomes,
} from '../features/cases/state';
import { useToast } from '../contexts/useToast';
import type { CreateCaseNoteDTO, NoteType } from '../types/case';
import type {
  InteractionOutcomeImpact,
  InteractionOutcomeImpactInput,
  OutcomeAttribution,
  OutcomeDefinition,
} from '../types/outcomes';
import { getNoteIcon, getNoteTypeLabel, formatNoteDate, NOTE_TYPE_OPTIONS } from '../utils/notes';

interface CaseNotesProps {
  caseId: string;
}

type OutcomeDraft = {
  selected: boolean;
  attribution: OutcomeAttribution;
  intensity: string;
  evidenceNote: string;
};

const DEFAULT_ATTRIBUTION: OutcomeAttribution = 'DIRECT';

const emptyOutcomeDraft = (): OutcomeDraft => ({
  selected: false,
  attribution: DEFAULT_ATTRIBUTION,
  intensity: '',
  evidenceNote: '',
});

const buildDraftMap = (
  definitions: OutcomeDefinition[],
  impacts: InteractionOutcomeImpact[] = []
): Record<string, OutcomeDraft> => {
  const byDefinitionId = new Map(impacts.map((impact) => [impact.outcome_definition_id, impact]));

  return definitions.reduce<Record<string, OutcomeDraft>>((acc, definition) => {
    const impact = byDefinitionId.get(definition.id);

    if (!impact) {
      acc[definition.id] = emptyOutcomeDraft();
      return acc;
    }

    acc[definition.id] = {
      selected: impact.impact !== false,
      attribution: impact.attribution || DEFAULT_ATTRIBUTION,
      intensity: impact.intensity ? String(impact.intensity) : '',
      evidenceNote: impact.evidence_note || '',
    };

    return acc;
  }, {});
};

const syncDraftMapToDefinitions = (
  definitions: OutcomeDefinition[],
  current: Record<string, OutcomeDraft>
): Record<string, OutcomeDraft> => {
  return definitions.reduce<Record<string, OutcomeDraft>>((acc, definition) => {
    acc[definition.id] = current[definition.id] || emptyOutcomeDraft();
    return acc;
  }, {});
};

const buildImpactsPayload = (drafts: Record<string, OutcomeDraft>): InteractionOutcomeImpactInput[] => {
  return Object.entries(drafts)
    .filter(([, draft]) => draft.selected)
    .map(([outcomeDefinitionId, draft]) => ({
      outcomeDefinitionId,
      impact: true,
      attribution: draft.attribution,
      intensity: draft.intensity ? Number(draft.intensity) : null,
      evidenceNote: draft.evidenceNote.trim() ? draft.evidenceNote.trim() : null,
    }));
};

const isDraftInvalid = (draft: OutcomeDraft): boolean => {
  if (!draft.selected) {
    return false;
  }

  if (!draft.intensity) {
    return false;
  }

  const value = Number(draft.intensity);
  if (!Number.isInteger(value)) {
    return true;
  }

  return value < 1 || value > 5;
};

const OutcomeDraftEditor = ({
  definition,
  draft,
  onChange,
}: {
  definition: OutcomeDefinition;
  draft: OutcomeDraft;
  onChange: (next: OutcomeDraft) => void;
}) => {
  return (
    <div className="border border-app-input-border rounded-lg p-3 bg-app-surface-muted/20">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={draft.selected}
          onChange={(event) =>
            onChange({
              ...draft,
              selected: event.target.checked,
            })
          }
          className="mt-1 rounded border-app-input-border text-app-accent focus:ring-app-accent"
        />
        <span>
          <span className="block text-sm font-semibold text-app-text">{definition.name}</span>
          {definition.description && (
            <span className="block text-xs text-app-text-muted mt-1">{definition.description}</span>
          )}
        </span>
      </label>

      {draft.selected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-app-text-muted mb-1">Attribution</label>
            <select
              value={draft.attribution}
              onChange={(event) =>
                onChange({
                  ...draft,
                  attribution: event.target.value as OutcomeAttribution,
                })
              }
              className="w-full px-2 py-1 border border-app-input-border rounded"
            >
              <option value="DIRECT">Direct</option>
              <option value="LIKELY">Likely</option>
              <option value="POSSIBLE">Possible</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-app-text-muted mb-1">Intensity (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={draft.intensity}
              onChange={(event) =>
                onChange({
                  ...draft,
                  intensity: event.target.value,
                })
              }
              className="w-full px-2 py-1 border border-app-input-border rounded"
            />
            {isDraftInvalid(draft) && (
              <p className="text-xs text-red-600 mt-1">Intensity must be a whole number from 1 to 5.</p>
            )}
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-app-text-muted mb-1">Evidence Note</label>
            <textarea
              value={draft.evidenceNote}
              onChange={(event) =>
                onChange({
                  ...draft,
                  evidenceNote: event.target.value.slice(0, 2000),
                })
              }
              rows={2}
              maxLength={2000}
              className="w-full px-2 py-1 border border-app-input-border rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const CaseNotes = ({ caseId }: CaseNotesProps) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const {
    caseNotes,
    loading,
    caseOutcomeDefinitions,
    outcomesLoading,
    outcomesSaving,
  } = useAppSelector((state) => state.casesV2);

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState<Partial<CreateCaseNoteDTO>>({
    case_id: caseId,
    note_type: 'note',
    subject: '',
    content: '',
    is_internal: false,
    is_important: false,
  });

  const activeOutcomeDefinitions = useMemo(
    () => (caseOutcomeDefinitions || []).filter((definition) => definition.is_active),
    [caseOutcomeDefinitions]
  );

  const [newNoteOutcomeDrafts, setNewNoteOutcomeDrafts] = useState<Record<string, OutcomeDraft>>({});

  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editingOutcomeDrafts, setEditingOutcomeDrafts] = useState<Record<string, OutcomeDraft>>({});

  useEffect(() => {
    void dispatch(fetchCaseOutcomeDefinitions(false));
  }, [dispatch]);

  useEffect(() => {
    if (activeOutcomeDefinitions.length === 0) {
      setNewNoteOutcomeDrafts({});
      return;
    }

    setNewNoteOutcomeDrafts((current) => syncDraftMapToDefinitions(activeOutcomeDefinitions, current));
  }, [activeOutcomeDefinitions]);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNote.content?.trim()) {
      showError('Please enter note content');
      return;
    }

    const invalidDraft = Object.values(newNoteOutcomeDrafts).some((draft) => isDraftInvalid(draft));
    if (invalidDraft) {
      showError('Fix outcome intensity values before saving');
      return;
    }

    try {
      const createdNote = await dispatch(
        createCaseNote({
          case_id: caseId,
          note_type: newNote.note_type as NoteType,
          subject: newNote.subject,
          content: newNote.content,
          is_internal: newNote.is_internal,
          is_important: newNote.is_important,
        })
      ).unwrap();

      const impactsPayload = buildImpactsPayload(newNoteOutcomeDrafts);

      if (impactsPayload.length > 0 && createdNote?.id) {
        try {
          await dispatch(
            saveInteractionOutcomes({
              caseId,
              interactionId: createdNote.id,
              data: { mode: 'replace', impacts: impactsPayload },
            })
          ).unwrap();
        } catch {
          showError('Note saved, but outcomes could not be saved. Try editing outcomes on the note.');
        }
      }

      showSuccess('Note added successfully');

      setNewNote({
        case_id: caseId,
        note_type: 'note',
        subject: '',
        content: '',
        is_internal: false,
        is_important: false,
      });
      setNewNoteOutcomeDrafts(buildDraftMap(activeOutcomeDefinitions));
      setIsAddingNote(false);
    } catch (error) {
      console.error('Failed to add note:', error);
      showError('Failed to add note. Please try again.');
    }
  };

  const handleStartEditOutcomes = async (interactionId: string, currentImpacts: InteractionOutcomeImpact[]) => {
    setEditingInteractionId(interactionId);
    setEditingOutcomeDrafts(buildDraftMap(activeOutcomeDefinitions, currentImpacts));

    try {
      const refreshed = await dispatch(
        fetchInteractionOutcomes({
          caseId,
          interactionId,
        })
      ).unwrap();
      setEditingOutcomeDrafts(buildDraftMap(activeOutcomeDefinitions, refreshed.impacts));
    } catch {
      // Keep current local data if refresh fails.
    }
  };

  const handleSaveEditedOutcomes = async () => {
    if (!editingInteractionId) {
      return;
    }

    const invalidDraft = Object.values(editingOutcomeDrafts).some((draft) => isDraftInvalid(draft));
    if (invalidDraft) {
      showError('Fix outcome intensity values before saving');
      return;
    }

    try {
      await dispatch(
        saveInteractionOutcomes({
          caseId,
          interactionId: editingInteractionId,
          data: {
            mode: 'replace',
            impacts: buildImpactsPayload(editingOutcomeDrafts),
          },
        })
      ).unwrap();

      showSuccess('Outcomes saved');
      setEditingInteractionId(null);
      setEditingOutcomeDrafts({});
    } catch {
      showError('Failed to save outcomes for this interaction');
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

          {/* Outcome Impacts */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-app-text mb-2">Outcome Impacts</h4>
            {activeOutcomeDefinitions.length === 0 ? (
              <p className="text-sm text-app-text-muted">
                No active outcomes are configured yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activeOutcomeDefinitions.map((definition) => (
                  <OutcomeDraftEditor
                    key={definition.id}
                    definition={definition}
                    draft={newNoteOutcomeDrafts[definition.id] || emptyOutcomeDraft()}
                    onChange={(nextDraft) =>
                      setNewNoteOutcomeDrafts((prev) => ({
                        ...prev,
                        [definition.id]: nextDraft,
                      }))
                    }
                  />
                ))}
              </div>
            )}
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
              disabled={loading || outcomesSaving || outcomesLoading}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50 transition"
            >
              {loading || outcomesSaving ? 'Saving...' : 'Add Note'}
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

        {caseNotes.map((note) => {
          const noteImpacts = (note.outcome_impacts || []).filter((impact) => impact.impact !== false);
          const isEditingThisNote = editingInteractionId === note.id;

          return (
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
                <button
                  type="button"
                  onClick={() =>
                    void handleStartEditOutcomes(note.id, note.outcome_impacts || [])
                  }
                  className="px-2 py-1 text-xs border border-app-input-border rounded hover:bg-app-surface-muted"
                >
                  Edit outcomes
                </button>
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

              {/* Saved outcomes */}
              {noteImpacts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-app-border">
                  <p className="text-xs font-semibold uppercase text-app-text-muted mb-2">Outcome Impacts</p>
                  <div className="space-y-2">
                    {noteImpacts.map((impact) => (
                      <div
                        key={impact.id}
                        className="text-sm text-app-text-muted bg-app-surface-muted rounded px-2 py-1"
                      >
                        <span className="font-medium text-app-text">{impact.outcome_definition?.name}</span>
                        <span className="ml-2">({impact.attribution})</span>
                        {impact.intensity && <span className="ml-2">Intensity: {impact.intensity}</span>}
                        {impact.evidence_note && (
                          <p className="mt-1 text-xs text-app-text-muted">{impact.evidence_note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit outcomes panel */}
              {isEditingThisNote && (
                <div className="mt-4 border border-app-border rounded-lg p-3 bg-app-surface-muted/20">
                  <h5 className="text-sm font-semibold text-app-text mb-2">Edit Outcome Impacts</h5>
                  {activeOutcomeDefinitions.length === 0 ? (
                    <p className="text-sm text-app-text-muted">No active outcomes available.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeOutcomeDefinitions.map((definition) => (
                        <OutcomeDraftEditor
                          key={definition.id}
                          definition={definition}
                          draft={editingOutcomeDrafts[definition.id] || emptyOutcomeDraft()}
                          onChange={(nextDraft) =>
                            setEditingOutcomeDrafts((prev) => ({
                              ...prev,
                              [definition.id]: nextDraft,
                            }))
                          }
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInteractionId(null);
                        setEditingOutcomeDrafts({});
                      }}
                      className="px-3 py-1 border border-app-input-border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveEditedOutcomes()}
                      disabled={outcomesSaving}
                      className="px-3 py-1 bg-app-accent text-white rounded disabled:opacity-50"
                    >
                      {outcomesSaving ? 'Saving...' : 'Save outcomes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaseNotes;
