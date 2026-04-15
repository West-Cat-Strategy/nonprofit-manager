import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { createContactNote, deleteContactNote, updateContactNote } from '../state';
import { selectContactCasesByContact } from '../state/contactCases';
import { contactsApiClient } from '../api/contactsApiClient';
import OutcomeTagSelector from '../../outcomes/components/OutcomeTagSelector';
import { useOutcomeDefinitions } from '../../outcomes/hooks/useOutcomeDefinitions';
import { buildOutcomeImpactPayload } from '../../outcomes/utils/outcomeSelection';
import { useToast } from '../../../contexts/useToast';
import type {
  ContactNoteTimelineCounts,
  ContactNoteTimelineItem,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
  ContactNoteType,
} from '../../../types/contact';
import { NOTE_TYPES } from '../../../types/contact';
import { getNoteIcon, getNoteTypeLabel, formatNoteDate } from '../../../utils/notes';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import ConfirmDialog from '../../../components/ConfirmDialog';

interface ContactNotesProps {
  contactId: string;
  openOnMount?: boolean;
  onOpenHandled?: () => void;
}

type ContactNoteDraft = CreateContactNoteDTO & {
  outcome_definition_ids: string[];
};

type NotesSourceFilter = 'all' | 'contact_note' | 'case_note' | 'event_activity';

const emptyNoteDraft = (): ContactNoteDraft => ({
  note_type: 'note',
  subject: '',
  content: '',
  is_internal: false,
  is_important: false,
  is_pinned: false,
  is_alert: false,
  is_portal_visible: false,
  case_id: undefined,
  outcome_definition_ids: [],
});

const emptyTimelineCounts: ContactNoteTimelineCounts = {
  all: 0,
  contact_notes: 0,
  case_notes: 0,
  event_activity: 0,
};

const sourceFilterOptions: Array<{
  value: NotesSourceFilter;
  label: string;
  countKey: keyof ContactNoteTimelineCounts;
}> = [
  { value: 'all', label: 'All', countKey: 'all' },
  { value: 'contact_note', label: 'My Notes', countKey: 'contact_notes' },
  { value: 'case_note', label: 'Case Notes', countKey: 'case_notes' },
  { value: 'event_activity', label: 'Event Activity', countKey: 'event_activity' },
];

const getSourceBadge = (item: ContactNoteTimelineItem): string => {
  switch (item.source_type) {
    case 'case_note':
      return 'Case Note';
    case 'event_activity':
      return 'Event Activity';
    default:
      return 'Contact Note';
  }
};

const getEventActivityBadge = (item: ContactNoteTimelineItem): string => {
  switch (item.activity_type) {
    case 'event_registration_updated':
      return 'Status';
    case 'event_check_in':
      return 'Check-In';
    default:
      return 'RSVP';
  }
};

const getTimelineTitle = (item: ContactNoteTimelineItem): string => {
  if (item.source_type === 'event_activity') {
    return item.title || item.event_name || 'Event activity';
  }

  if (item.title?.trim()) {
    return item.title;
  }

  return getNoteTypeLabel((item.note_type as ContactNoteType) || 'note');
};

const getTimelineIcon = (item: ContactNoteTimelineItem): string => {
  if (item.source_type === 'event_activity') {
    switch (item.activity_type) {
      case 'event_check_in':
        return '✓';
      case 'event_registration_updated':
        return '↻';
      default:
        return '◦';
    }
  }

  return getNoteIcon((item.note_type as ContactNoteType) || 'note');
};

const ContactNotesPanel = ({ contactId, openOnMount = false, onOpenHandled }: ContactNotesProps) => {
  const dispatch = useAppDispatch();
  const { notesLoading } = useAppSelector((state) => state.contacts.notes);
  const contactCases = useAppSelector((state) => selectContactCasesByContact(state, contactId));
  const {
    outcomeDefinitions,
    canTagOutcomes,
    loading: outcomeDefinitionsLoading,
  } = useOutcomeDefinitions();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [submitMode, setSubmitMode] = useState<'close' | 'another'>('close');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<NotesSourceFilter>('all');
  const [newNote, setNewNote] = useState<ContactNoteDraft>(emptyNoteDraft);
  const [timelineItems, setTimelineItems] = useState<ContactNoteTimelineItem[]>([]);
  const [timelineCounts, setTimelineCounts] = useState<ContactNoteTimelineCounts>(emptyTimelineCounts);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    try {
      setTimelineLoading(true);
      setTimelineError(null);
      const response = await contactsApiClient.listNoteTimeline(contactId);
      setTimelineItems(response.items || []);
      setTimelineCounts(response.counts || emptyTimelineCounts);
    } catch (error) {
      console.error('Failed to load contact note timeline:', error);
      setTimelineError('Failed to load notes timeline');
    } finally {
      setTimelineLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

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

  const handleSubmitNote = async (event: FormEvent) => {
    event.preventDefault();

    if (!newNote.content?.trim()) {
      showError('Please enter note content');
      return;
    }

    try {
      const payload: CreateContactNoteDTO = {
        case_id: newNote.case_id,
        note_type: newNote.note_type,
        subject: newNote.subject,
        content: newNote.content,
        is_internal: newNote.is_internal,
        is_important: newNote.is_important,
        is_pinned: newNote.is_pinned,
        is_alert: newNote.is_alert,
        is_portal_visible: newNote.is_portal_visible,
        ...(newNote.outcome_definition_ids.length > 0
          ? {
              outcome_impacts: buildOutcomeImpactPayload(newNote.outcome_definition_ids),
              outcomes_mode: 'replace' as const,
            }
          : {}),
      };

      await dispatch(
        createContactNote({
          contactId,
          data: payload,
        })
      ).unwrap();

      await loadTimeline();
      showSuccess('Note added successfully');
      setNewNote(emptyNoteDraft());
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
      await loadTimeline();
      showSuccess('Note deleted');
    } catch (error) {
      console.error('Failed to delete note:', error);
      showError('Failed to delete note');
    }
  };

  const handleToggleFlag = async (noteId: string, updates: Partial<UpdateContactNoteDTO>) => {
    try {
      await dispatch(updateContactNote({ noteId, data: updates })).unwrap();
      await loadTimeline();
      showSuccess('Note updated');
    } catch (error) {
      console.error('Failed to update note:', error);
      showError('Failed to update note');
    }
  };

  const filteredTimelineItems = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return [...timelineItems]
      .sort((left, right) => {
        if (left.is_pinned && !right.is_pinned) return -1;
        if (!left.is_pinned && right.is_pinned) return 1;
        if (left.is_alert && !right.is_alert) return -1;
        if (!left.is_alert && right.is_alert) return 1;
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      })
      .filter((item) => {
        if (sourceFilter !== 'all' && item.source_type !== sourceFilter) {
          return false;
        }

        if (!needle) {
          return true;
        }

        const haystack = [
          item.title,
          item.content,
          item.case_number,
          item.case_title,
          item.event_name,
          item.registration_status,
          item.previous_registration_status,
          item.next_registration_status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(needle);
      });
  }, [searchTerm, sourceFilter, timelineItems]);

  return (
    <div className="space-y-6">
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

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search notes, cases, or events..."
          className="px-3 py-2 border-2 border-black text-sm font-bold"
        />
        <div className="flex flex-wrap gap-2">
          {sourceFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSourceFilter(option.value)}
              className={`px-3 py-2 text-xs font-black uppercase border-2 border-black transition ${
                sourceFilter === option.value
                  ? 'bg-[var(--loop-yellow)] text-black'
                  : 'bg-app-surface text-black'
              }`}
            >
              {option.label} ({timelineCounts[option.countKey]})
            </button>
          ))}
        </div>
      </div>

      {!isAddingNote && (
        <button
          onClick={() => setIsAddingNote(true)}
          className="w-full px-4 py-3 bg-app-accent-soft text-app-accent-text rounded-lg hover:bg-app-accent-soft-hover transition border border-app-accent"
        >
          + Add Note
        </button>
      )}

      {isAddingNote && (
        <form onSubmit={handleSubmitNote} className="bg-app-surface rounded-lg border border-app-border p-4">
          <h3 className="text-lg font-semibold mb-4">Add Note</h3>

          <div className="mb-4">
            <label
              htmlFor="contact-note-type"
              className="block text-sm font-medium text-app-text-label mb-2"
            >
              Note Type
            </label>
            <select
              id="contact-note-type"
              value={newNote.note_type}
              onChange={(event) =>
                setNewNote((prev) => ({
                  ...prev,
                  note_type: event.target.value as ContactNoteType,
                }))
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

          {contactCases.length > 0 && (
            <div className="mb-4">
              <label
                htmlFor="contact-note-case"
                className="block text-sm font-medium text-app-text-label mb-2"
              >
                Associate with Case (Optional)
              </label>
              <select
                id="contact-note-case"
                value={newNote.case_id || ''}
                onChange={(event) =>
                  setNewNote((prev) => ({
                    ...prev,
                    case_id: event.target.value || undefined,
                    outcome_definition_ids: event.target.value ? prev.outcome_definition_ids : [],
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

          {newNote.case_id && canTagOutcomes && !outcomeDefinitionsLoading && (
            <div className="mb-4">
              <OutcomeTagSelector
                outcomeDefinitions={outcomeDefinitions}
                selectedOutcomeDefinitionIds={newNote.outcome_definition_ids}
                onToggle={(outcomeDefinitionId) =>
                  setNewNote((prev) => ({
                    ...prev,
                    outcome_definition_ids: prev.outcome_definition_ids.includes(outcomeDefinitionId)
                      ? prev.outcome_definition_ids.filter((id) => id !== outcomeDefinitionId)
                      : [...prev.outcome_definition_ids, outcomeDefinitionId],
                  }))
                }
              />
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="contact-note-subject"
              className="block text-sm font-medium text-app-text-label mb-2"
            >
              Subject
            </label>
            <input
              id="contact-note-subject"
              type="text"
              value={newNote.subject || ''}
              onChange={(event) => setNewNote((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="Brief summary (optional)"
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="contact-note-content"
              className="block text-sm font-medium text-app-text-label mb-2"
            >
              Content <span className="text-app-accent">*</span>
            </label>
            <textarea
              id="contact-note-content"
              value={newNote.content}
              onChange={(event) => setNewNote((prev) => ({ ...prev, content: event.target.value }))}
              rows={4}
              required
              placeholder="Enter note details..."
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-transparent"
            />
          </div>

          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_internal}
                onChange={(event) =>
                  setNewNote((prev) => ({ ...prev, is_internal: event.target.checked }))
                }
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Internal note (staff only)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(newNote.is_portal_visible)}
                onChange={(event) =>
                  setNewNote((prev) => ({ ...prev, is_portal_visible: event.target.checked }))
                }
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Visible in client portal</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_important}
                onChange={(event) =>
                  setNewNote((prev) => ({ ...prev, is_important: event.target.checked }))
                }
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Mark as important</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_pinned}
                onChange={(event) =>
                  setNewNote((prev) => ({ ...prev, is_pinned: event.target.checked }))
                }
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">Pin to top</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newNote.is_alert}
                onChange={(event) =>
                  setNewNote((prev) => ({ ...prev, is_alert: event.target.checked }))
                }
                className="rounded border-app-input-border text-app-accent focus:ring-app-accent"
              />
              <span className="text-sm text-app-text-muted">
                Mark as alert (shows popup when viewing contact)
              </span>
            </label>
          </div>

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
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50 transition"
            >
              {notesLoading ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {timelineLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent mx-auto"></div>
            <p className="text-app-text-muted mt-2">Loading notes timeline...</p>
          </div>
        )}

        {!timelineLoading && timelineError && (
          <div className="rounded-lg border border-app-border bg-app-accent-soft p-4">
            <p className="text-sm font-semibold text-app-accent-text">{timelineError}</p>
            <button
              type="button"
              onClick={() => void loadTimeline()}
              className="mt-3 rounded border border-black bg-white px-3 py-2 text-xs font-black uppercase"
            >
              Retry
            </button>
          </div>
        )}

        {!timelineLoading && !timelineError && filteredTimelineItems.length === 0 && (
          <div className="text-center py-12 bg-app-surface-muted rounded-lg">
            <div className="text-app-text-subtle text-4xl mb-2">📝</div>
            <p className="text-app-text-muted">No matching notes yet</p>
            <p className="text-sm text-app-text-muted mt-1">
              Contact notes, linked case notes, and event updates will appear here.
            </p>
          </div>
        )}

        {!timelineLoading &&
          !timelineError &&
          filteredTimelineItems.map((item) => {
            const isContactNote = item.source_type === 'contact_note';
            const cardClass = isContactNote
              ? item.is_alert
                ? 'border-app-border bg-app-accent-soft'
                : item.is_important
                ? 'border-app-border bg-app-accent-soft'
                : item.is_pinned
                ? 'border-app-accent bg-app-accent-soft'
                : 'border-app-border'
              : 'border-app-border';

            return (
              <div key={item.id} className={`bg-app-surface rounded-lg border p-4 ${cardClass}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getTimelineIcon(item)}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded uppercase font-black">
                          {getSourceBadge(item)}
                        </span>
                        {item.source_type === 'event_activity' ? (
                          <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded uppercase font-black">
                            {getEventActivityBadge(item)}
                          </span>
                        ) : (
                          <span className="font-medium text-app-text">
                            {getNoteTypeLabel((item.note_type as ContactNoteType) || 'note')}
                          </span>
                        )}
                        {item.is_pinned && (
                          <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded">
                            Pinned
                          </span>
                        )}
                        {item.is_internal && (
                          <span className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded">
                            Internal
                          </span>
                        )}
                        {item.is_portal_visible && (
                          <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded">
                            Shared in portal
                          </span>
                        )}
                        {item.is_important && (
                          <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded">
                            Important
                          </span>
                        )}
                        {item.is_alert && (
                          <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded font-semibold">
                            Alert
                          </span>
                        )}
                        {item.registration_status && item.source_type === 'event_activity' && (
                          <span className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded uppercase font-black">
                            {item.registration_status.replace('_', ' ')}
                          </span>
                        )}
                        {item.previous_registration_status && item.next_registration_status && (
                          <span className="px-2 py-0.5 text-xs bg-app-surface-muted text-app-text-muted rounded uppercase font-black">
                            {item.previous_registration_status.replace('_', ' ')} →{' '}
                            {item.next_registration_status.replace('_', ' ')}
                          </span>
                        )}
                        {item.checked_in && (
                          <span className="px-2 py-0.5 text-xs bg-app-accent-soft text-app-accent-text rounded uppercase font-black">
                            Checked in{item.check_in_method ? ` (${item.check_in_method})` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-app-text-muted">
                        {[item.created_by_first_name, item.created_by_last_name].filter(Boolean).join(' ') ||
                          'System'}{' '}
                        • {formatNoteDate(item.created_at)}
                      </div>
                    </div>
                  </div>

                  {isContactNote && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFlag(item.id, { is_pinned: !item.is_pinned })}
                        className={`text-xs font-bold uppercase px-2 py-1 border rounded ${
                          item.is_pinned
                            ? 'border-app-accent text-app-accent-text'
                            : 'border-app-input-border text-app-text-muted'
                        }`}
                        title="Toggle pin"
                      >
                        Pin
                      </button>
                      <button
                        onClick={() =>
                          handleToggleFlag(item.id, { is_important: !item.is_important })
                        }
                        className={`text-xs font-bold uppercase px-2 py-1 border rounded ${
                          item.is_important
                            ? 'border-app-border text-app-accent-text'
                            : 'border-app-input-border text-app-text-muted'
                        }`}
                        title="Toggle important"
                      >
                        Important
                      </button>
                      <button
                        onClick={() => handleToggleFlag(item.id, { is_alert: !item.is_alert })}
                        className={`text-xs font-bold uppercase px-2 py-1 border rounded ${
                          item.is_alert
                            ? 'border-app-border text-app-accent-text'
                            : 'border-app-input-border text-app-text-muted'
                        }`}
                        title="Toggle alert"
                      >
                        Alert
                      </button>
                      <button
                        onClick={() => handleDeleteNote(item.id)}
                        className="text-app-text-subtle hover:text-app-accent transition"
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
                  )}
                </div>

                <div className="font-medium text-app-text mb-2">{getTimelineTitle(item)}</div>

                {item.content && (
                  <div className="text-app-text-muted whitespace-pre-wrap">{item.content}</div>
                )}

                {(item.outcome_impacts || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.outcome_impacts || []).map((impact) => (
                      <span
                        key={impact.id}
                        className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text"
                      >
                        {impact.outcome_definition?.name || impact.outcome_definition_id}
                      </span>
                    ))}
                  </div>
                )}

                {(item.case_id || item.event_id) && (
                  <div className="mt-3 pt-3 border-t border-app-border flex flex-wrap gap-2">
                    {item.case_id && (
                      <Link
                        to={`/cases/${item.case_id}`}
                        className="inline-flex items-center rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-xs font-black uppercase text-app-text hover:bg-app-hover"
                      >
                        Open Case {item.case_number ? `(${item.case_number})` : ''}
                      </Link>
                    )}
                    {item.event_id && (
                      <Link
                        to={`/events/${item.event_id}`}
                        className="inline-flex items-center rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-xs font-black uppercase text-app-text hover:bg-app-hover"
                      >
                        Open Event
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
};

export default ContactNotesPanel;
