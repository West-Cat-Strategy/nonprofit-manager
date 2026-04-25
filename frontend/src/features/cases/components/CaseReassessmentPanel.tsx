import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrutalBadge, BrutalButton } from '../../../components/neo-brutalist';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseReassessment,
  CreateCaseReassessmentDTO,
  UpdateCaseReassessmentDTO,
} from '../../../types/case';
import type { OutcomeDefinition } from '../../../types/outcomes';
import { casesApiClient } from '../api/casesApiClient';

interface CaseReassessmentPanelProps {
  caseId: string;
  defaultOwnerUserId?: string | null;
  defaultOwnerName?: string | null;
  outcomeDefinitions?: OutcomeDefinition[];
  onChanged?: () => void;
}

interface ReassessmentFormState {
  title: string;
  dueDate: string;
  earliestDate: string;
  latestDate: string;
  summary: string;
}

const emptyForm = (): ReassessmentFormState => ({
  title: '',
  dueDate: '',
  earliestDate: '',
  latestDate: '',
  summary: '',
});

const dateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [datePart] = value.split('T');
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string | null | undefined): string => {
  const date = dateOnly(value);
  return date ? date.toLocaleDateString() : 'Not set';
};

const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getOwnerLabel = (
  reassessment: CaseReassessment,
  defaultOwnerUserId?: string | null,
  defaultOwnerName?: string | null
): string | null => {
  if (!reassessment.owner_user_id) return null;
  if (defaultOwnerUserId && reassessment.owner_user_id === defaultOwnerUserId) {
    return defaultOwnerName || 'Current staff owner';
  }
  return 'Assigned staff';
};

const getWindowState = (reassessment: CaseReassessment): string => {
  if (reassessment.status === 'completed') return 'Completed';
  if (reassessment.status === 'cancelled') return 'Cancelled';

  const today = getToday();
  const dueDate = dateOnly(reassessment.due_date);
  const earliestDate = dateOnly(reassessment.earliest_review_date);
  const latestDate = dateOnly(reassessment.latest_review_date);

  if (latestDate && today > latestDate) return 'Window lapsed';
  if (dueDate && today > dueDate) return 'Overdue';
  if (earliestDate && today < earliestDate) return `Opens ${formatDate(reassessment.earliest_review_date)}`;
  if (earliestDate && latestDate && today >= earliestDate && today <= latestDate) return 'In window';
  if (earliestDate && today >= earliestDate) return 'In window';

  if (dueDate) {
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
    if (daysUntilDue <= 7) return 'Due soon';
  }

  return 'Scheduled';
};

const getBadgeColor = (state: string): 'green' | 'yellow' | 'red' | 'gray' | 'blue' => {
  if (state === 'Completed') return 'green';
  if (state === 'Cancelled') return 'gray';
  if (state === 'Overdue' || state === 'Window lapsed') return 'red';
  if (state === 'In window' || state === 'Due soon') return 'yellow';
  return 'blue';
};

const sortReassessments = (items: CaseReassessment[]): CaseReassessment[] =>
  [...items].sort((left, right) => {
    const leftDate = dateOnly(left.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDate = dateOnly(right.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (left.status === right.status) return leftDate - rightDate;
    if (left.status === 'completed' || left.status === 'cancelled') return 1;
    if (right.status === 'completed' || right.status === 'cancelled') return -1;
    return leftDate - rightDate;
  });

export default function CaseReassessmentPanel({
  caseId,
  defaultOwnerUserId,
  defaultOwnerName,
  outcomeDefinitions = [],
  onChanged,
}: CaseReassessmentPanelProps) {
  const { showError, showSuccess } = useToast();
  const [reassessments, setReassessments] = useState<CaseReassessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ReassessmentFormState>(() => emptyForm());
  const [completeDraft, setCompleteDraft] = useState<{
    id: string;
    summary: string;
    outcomeDefinitionIds: string[];
    scheduleNext: boolean;
    nextTitle: string;
    nextDueDate: string;
    nextEarliestDate: string;
    nextLatestDate: string;
    nextSummary: string;
  } | null>(null);
  const [cancelDraft, setCancelDraft] = useState<{ id: string; reason: string } | null>(null);

  const loadReassessments = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await casesApiClient.listCaseReassessments(caseId);
      setReassessments(sortReassessments(rows));
    } catch (error) {
      console.error('Failed to load case reassessments', error);
      showError('Unable to load reassessments.');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void loadReassessments();
  }, [loadReassessments]);

  const activeReassessments = useMemo(
    () =>
      reassessments.filter(
        (reassessment) =>
          reassessment.status !== 'completed' && reassessment.status !== 'cancelled'
      ),
    [reassessments]
  );

  const currentReassessment = activeReassessments[0] || null;
  const nextReassessment = activeReassessments[1] || null;

  const refreshAfterMutation = async () => {
    await loadReassessments();
    onChanged?.();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState(emptyForm());
    setFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setCompleteDraft(null);
    setCancelDraft(null);
    setFormState(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = (reassessment: CaseReassessment) => {
    setEditingId(reassessment.id);
    setCompleteDraft(null);
    setCancelDraft(null);
    setFormState({
      title: reassessment.title || '',
      dueDate: reassessment.due_date?.split('T')[0] || '',
      earliestDate: reassessment.earliest_review_date?.split('T')[0] || '',
      latestDate: reassessment.latest_review_date?.split('T')[0] || '',
      summary: reassessment.summary || '',
    });
    setFormOpen(true);
  };

  const updateFormField = (field: keyof ReassessmentFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const buildCreatePayload = (): CreateCaseReassessmentDTO => ({
    title: formState.title.trim(),
    due_date: formState.dueDate,
    earliest_review_date: formState.earliestDate || null,
    latest_review_date: formState.latestDate || null,
    summary: formState.summary.trim() || null,
  });

  const buildUpdatePayload = (): UpdateCaseReassessmentDTO => ({
    title: formState.title.trim(),
    due_date: formState.dueDate,
    earliest_review_date: formState.earliestDate || null,
    latest_review_date: formState.latestDate || null,
    summary: formState.summary.trim() || null,
  });

  const handleSave = async () => {
    if (!formState.title.trim() || !formState.dueDate) {
      showError('Title and due date are required.');
      return;
    }

    try {
      setActionId(editingId || 'new');
      if (editingId) {
        await casesApiClient.updateCaseReassessment(caseId, editingId, buildUpdatePayload());
        showSuccess('Reassessment updated.');
      } else {
        await casesApiClient.createCaseReassessment(caseId, buildCreatePayload());
        showSuccess('Reassessment created.');
      }
      resetForm();
      await refreshAfterMutation();
    } catch (error) {
      console.error('Failed to save case reassessment', error);
      showError('Unable to save reassessment.');
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async () => {
    if (!completeDraft) return;

    if (!completeDraft.summary.trim()) {
      showError('Completion summary is required.');
      return;
    }

    if (completeDraft.outcomeDefinitionIds.length === 0) {
      showError('Select at least one outcome for this reassessment.');
      return;
    }

    if (completeDraft.scheduleNext && !completeDraft.nextDueDate) {
      showError('Next reassessment due date is required.');
      return;
    }

    try {
      setActionId(completeDraft.id);
      await casesApiClient.completeCaseReassessment(caseId, completeDraft.id, {
        completion_summary: completeDraft.summary.trim(),
        outcome_definition_ids: completeDraft.outcomeDefinitionIds,
        ...(completeDraft.scheduleNext
          ? {
              next_title: completeDraft.nextTitle.trim() || undefined,
              next_due_date: completeDraft.nextDueDate,
              next_summary: completeDraft.nextSummary.trim() || null,
              next_earliest_review_date: completeDraft.nextEarliestDate || null,
              next_latest_review_date: completeDraft.nextLatestDate || null,
            }
          : {}),
      });
      showSuccess(
        completeDraft.scheduleNext
          ? 'Reassessment completed and next review scheduled.'
          : 'Reassessment completed.'
      );
      setCompleteDraft(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Failed to complete case reassessment', error);
      showError('Unable to complete reassessment.');
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelDraft) return;
    const reason = cancelDraft.reason.trim();

    if (!reason) {
      showError('Cancellation reason is required.');
      return;
    }

    try {
      setActionId(cancelDraft.id);
      await casesApiClient.cancelCaseReassessment(caseId, cancelDraft.id, {
        cancellation_reason: reason,
      });
      showSuccess('Reassessment cancelled.');
      setCancelDraft(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Failed to cancel case reassessment', error);
      showError('Unable to cancel reassessment.');
    } finally {
      setActionId(null);
    }
  };

  const renderSummary = (label: string, reassessment: CaseReassessment | null) => {
    if (!reassessment) {
      return (
        <div className="border-2 border-dashed border-black/30 bg-app-surface-muted p-3 text-sm font-bold text-black/60 dark:text-white/60">
          {label}: None scheduled
        </div>
      );
    }

    const state = getWindowState(reassessment);
    const owner = getOwnerLabel(reassessment, defaultOwnerUserId, defaultOwnerName);

    return (
      <div className="border-2 border-black bg-app-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                {label}
              </span>
              <BrutalBadge color={getBadgeColor(state)} size="sm">
                {state}
              </BrutalBadge>
              <BrutalBadge color="gray" size="sm">
                {reassessment.status.replace('_', ' ')}
              </BrutalBadge>
            </div>
            <h3 className="text-base font-black uppercase text-black dark:text-white">
              {reassessment.title || 'Case reassessment'}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-black/70 dark:text-white/70">
              <span>Due: {formatDate(reassessment.due_date)}</span>
              {reassessment.earliest_review_date && (
                <span>Earliest: {formatDate(reassessment.earliest_review_date)}</span>
              )}
              {reassessment.latest_review_date && (
                <span>Latest: {formatDate(reassessment.latest_review_date)}</span>
              )}
              {owner && <span>Owner: {owner}</span>}
              {reassessment.follow_up_id && <span>Follow-up linked</span>}
            </div>
            {reassessment.summary && (
              <p className="text-sm font-medium text-black/80 dark:text-white/80">
                {reassessment.summary}
              </p>
            )}
            {reassessment.cancellation_reason && (
              <p className="text-sm font-bold text-app-accent">
                Cancelled: {reassessment.cancellation_reason}
              </p>
            )}
          </div>

          {reassessment.status !== 'completed' && reassessment.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2">
              <BrutalButton onClick={() => openEditForm(reassessment)} variant="secondary" size="sm">
                Edit
              </BrutalButton>
              <BrutalButton
                onClick={() =>
                  setCompleteDraft({
                    id: reassessment.id,
                    summary: reassessment.summary || '',
                    outcomeDefinitionIds: [],
                    scheduleNext: false,
                    nextTitle: reassessment.title || '',
                    nextDueDate: '',
                    nextEarliestDate: '',
                    nextLatestDate: '',
                    nextSummary: reassessment.summary || '',
                  })
                }
                disabled={actionId === reassessment.id}
                variant="success"
                size="sm"
              >
                Complete
              </BrutalButton>
              <BrutalButton
                onClick={() => setCancelDraft({ id: reassessment.id, reason: '' })}
                disabled={actionId === reassessment.id}
                variant="danger"
                size="sm"
              >
                Cancel
              </BrutalButton>
            </div>
          )}
        </div>

        {completeDraft?.id === reassessment.id && (
          <div className="mt-4 border-t-2 border-black pt-4">
            <label
              htmlFor={`reassessment-complete-${reassessment.id}`}
              className="block text-xs font-black uppercase text-black/70 dark:text-white/70"
            >
              Completion Summary
            </label>
            <textarea
              id={`reassessment-complete-${reassessment.id}`}
              value={completeDraft.summary}
              onChange={(event) =>
                setCompleteDraft({
                  id: reassessment.id,
                  summary: event.target.value,
                  outcomeDefinitionIds: completeDraft.outcomeDefinitionIds,
                  scheduleNext: completeDraft.scheduleNext,
                  nextTitle: completeDraft.nextTitle,
                  nextDueDate: completeDraft.nextDueDate,
                  nextEarliestDate: completeDraft.nextEarliestDate,
                  nextLatestDate: completeDraft.nextLatestDate,
                  nextSummary: completeDraft.nextSummary,
                })
              }
              rows={2}
              className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            {outcomeDefinitions.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {outcomeDefinitions.map((definition) => (
                  <label
                    key={definition.id}
                    className="flex items-center gap-2 border-2 border-black bg-app-surface px-3 py-2 text-xs font-black uppercase text-black"
                  >
                    <input
                      type="checkbox"
                      checked={completeDraft.outcomeDefinitionIds.includes(definition.id)}
                      onChange={(event) => {
                        const nextIds = event.target.checked
                          ? [...completeDraft.outcomeDefinitionIds, definition.id]
                          : completeDraft.outcomeDefinitionIds.filter((id) => id !== definition.id);
                        setCompleteDraft({
                          id: reassessment.id,
                          summary: completeDraft.summary,
                          outcomeDefinitionIds: nextIds,
                          scheduleNext: completeDraft.scheduleNext,
                          nextTitle: completeDraft.nextTitle,
                          nextDueDate: completeDraft.nextDueDate,
                          nextEarliestDate: completeDraft.nextEarliestDate,
                          nextLatestDate: completeDraft.nextLatestDate,
                          nextSummary: completeDraft.nextSummary,
                        });
                      }}
                    />
                    {definition.name}
                  </label>
                ))}
              </div>
            )}
            <label className="mt-4 flex items-center gap-2 border-2 border-black bg-app-surface px-3 py-2 text-xs font-black uppercase text-black">
              <input
                type="checkbox"
                checked={completeDraft.scheduleNext}
                onChange={(event) =>
                  setCompleteDraft({
                    ...completeDraft,
                    scheduleNext: event.target.checked,
                  })
                }
              />
              Schedule next reassessment
            </label>
            {completeDraft.scheduleNext && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label htmlFor={`reassessment-next-title-${reassessment.id}`} className="block text-xs font-black uppercase text-black/70 dark:text-white/70">
                  Next Title
                  <input
                    id={`reassessment-next-title-${reassessment.id}`}
                    type="text"
                    value={completeDraft.nextTitle}
                    onChange={(event) =>
                      setCompleteDraft({ ...completeDraft, nextTitle: event.target.value })
                    }
                    className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
                <label htmlFor={`reassessment-next-due-${reassessment.id}`} className="block text-xs font-black uppercase text-black/70 dark:text-white/70">
                  Next Due Date
                  <input
                    id={`reassessment-next-due-${reassessment.id}`}
                    type="date"
                    value={completeDraft.nextDueDate}
                    onChange={(event) =>
                      setCompleteDraft({ ...completeDraft, nextDueDate: event.target.value })
                    }
                    className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
                <label htmlFor={`reassessment-next-earliest-${reassessment.id}`} className="block text-xs font-black uppercase text-black/70 dark:text-white/70">
                  Earliest
                  <input
                    id={`reassessment-next-earliest-${reassessment.id}`}
                    type="date"
                    value={completeDraft.nextEarliestDate}
                    onChange={(event) =>
                      setCompleteDraft({ ...completeDraft, nextEarliestDate: event.target.value })
                    }
                    className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
                <label htmlFor={`reassessment-next-latest-${reassessment.id}`} className="block text-xs font-black uppercase text-black/70 dark:text-white/70">
                  Latest
                  <input
                    id={`reassessment-next-latest-${reassessment.id}`}
                    type="date"
                    value={completeDraft.nextLatestDate}
                    onChange={(event) =>
                      setCompleteDraft({ ...completeDraft, nextLatestDate: event.target.value })
                    }
                    className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
                <label htmlFor={`reassessment-next-summary-${reassessment.id}`} className="block text-xs font-black uppercase text-black/70 dark:text-white/70 md:col-span-2">
                  Next Summary
                  <textarea
                    id={`reassessment-next-summary-${reassessment.id}`}
                    value={completeDraft.nextSummary}
                    onChange={(event) =>
                      setCompleteDraft({ ...completeDraft, nextSummary: event.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <BrutalButton onClick={() => setCompleteDraft(null)} variant="secondary" size="sm">
                Close
              </BrutalButton>
              <BrutalButton onClick={() => void handleComplete()} variant="success" size="sm">
                Save Completion
              </BrutalButton>
            </div>
          </div>
        )}

        {cancelDraft?.id === reassessment.id && (
          <div className="mt-4 border-t-2 border-black pt-4">
            <label
              htmlFor={`reassessment-cancel-${reassessment.id}`}
              className="block text-xs font-black uppercase text-black/70 dark:text-white/70"
            >
              Cancellation Reason
            </label>
            <textarea
              id={`reassessment-cancel-${reassessment.id}`}
              value={cancelDraft.reason}
              onChange={(event) =>
                setCancelDraft({ id: reassessment.id, reason: event.target.value })
              }
              rows={2}
              className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="mt-3 flex justify-end gap-2">
              <BrutalButton onClick={() => setCancelDraft(null)} variant="secondary" size="sm">
                Close
              </BrutalButton>
              <BrutalButton onClick={() => void handleCancel()} variant="danger" size="sm">
                Confirm Cancel
              </BrutalButton>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mb-6 space-y-4" aria-label="Case reassessments">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black uppercase text-black dark:text-white">
            Case Reassessments
          </h2>
          {defaultOwnerName && (
            <p className="text-xs font-bold uppercase text-black/60 dark:text-white/60">
              Default owner: {defaultOwnerName}
            </p>
          )}
        </div>
        <BrutalButton onClick={openCreateForm} variant="primary" size="sm">
          New Reassessment
        </BrutalButton>
      </div>

      {loading ? (
        <div className="border-2 border-black bg-app-surface-muted p-4 text-sm font-bold text-black/70 dark:text-white/70">
          Loading reassessments...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {renderSummary('Current', currentReassessment)}
          {renderSummary('Next', nextReassessment)}
        </div>
      )}

      {formOpen && (
        <div className="border-2 border-black bg-[var(--loop-cyan)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase text-black">
              {editingId ? 'Edit Reassessment' : 'Create Reassessment'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="border-2 border-black bg-app-surface px-2 py-1 text-xs font-black uppercase text-black"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label htmlFor="case-reassessment-title" className="block text-xs font-black uppercase text-black">
              Title
              <input
                id="case-reassessment-title"
                type="text"
                value={formState.title}
                onChange={(event) => updateFormField('title', event.target.value)}
                required
                className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </label>
            <label htmlFor="case-reassessment-due-date" className="block text-xs font-black uppercase text-black">
              Due Date
              <input
                id="case-reassessment-due-date"
                type="date"
                value={formState.dueDate}
                onChange={(event) => updateFormField('dueDate', event.target.value)}
                required
                className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="case-reassessment-earliest-date" className="block text-xs font-black uppercase text-black">
                Earliest
                <input
                  id="case-reassessment-earliest-date"
                  type="date"
                  value={formState.earliestDate}
                  onChange={(event) => updateFormField('earliestDate', event.target.value)}
                  className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </label>
              <label htmlFor="case-reassessment-latest-date" className="block text-xs font-black uppercase text-black">
                Latest
                <input
                  id="case-reassessment-latest-date"
                  type="date"
                  value={formState.latestDate}
                  onChange={(event) => updateFormField('latestDate', event.target.value)}
                  className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </label>
            </div>
            <label htmlFor="case-reassessment-summary" className="block text-xs font-black uppercase text-black md:col-span-2">
              Summary
              <textarea
                id="case-reassessment-summary"
                value={formState.summary}
                onChange={(event) => updateFormField('summary', event.target.value)}
                rows={2}
                className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <BrutalButton onClick={resetForm} variant="secondary" size="sm">
              Cancel
            </BrutalButton>
            <BrutalButton
              onClick={() => void handleSave()}
              disabled={!formState.title.trim() || !formState.dueDate || actionId === 'new' || actionId === editingId}
              variant="primary"
              size="sm"
            >
              {editingId ? 'Update' : 'Create'}
            </BrutalButton>
          </div>
        </div>
      )}
    </section>
  );
}
