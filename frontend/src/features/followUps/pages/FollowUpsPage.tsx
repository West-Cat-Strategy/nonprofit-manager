import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FollowUpForm from '../../../components/FollowUpForm';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  cancelFollowUp,
  completeFollowUp,
  deleteFollowUp,
  fetchFollowUpSummary,
  fetchFollowUps,
  rescheduleFollowUp,
} from '../state';
import type {
  FollowUpEntityOption,
  FollowUpEntityType,
  FollowUpFilters,
  FollowUpWithEntity,
} from '../../../types/followup';
import FollowUpEntityPicker from '../components/FollowUpEntityPicker';
import RescheduleFollowUpDialog from '../components/RescheduleFollowUpDialog';
import { getFollowUpErrorMessage } from '../utils/followUpErrorMessage';
import { parseAllowedValue, parsePositiveInteger } from '../../../utils/persistedFilters';

const PAGE_SIZE = 20;
const FOLLOW_UP_ENTITY_TYPE_VALUES = ['case', 'task'] as const;
const FOLLOW_UP_STATUS_VALUES = ['scheduled', 'completed', 'cancelled', 'overdue'] as const;

const formatDateTime = (followUp: FollowUpWithEntity): string => {
  if (!followUp.scheduled_time) return followUp.scheduled_date;
  return `${followUp.scheduled_date} ${followUp.scheduled_time}`;
};

const getEntityLabel = (followUp: FollowUpWithEntity): string => {
  if (followUp.entity_type === 'case') {
    return followUp.case_title || followUp.case_number || 'Case';
  }

  return followUp.task_subject || 'Task';
};

const getEntityHref = (followUp: FollowUpWithEntity): string => {
  if (followUp.entity_type === 'case') {
    return `/cases/${followUp.entity_id}`;
  }

  return `/tasks/${followUp.entity_id}`;
};

const buildFollowUpSearchParams = ({
  search,
  entityType,
  status,
  page,
}: {
  search: string;
  entityType: FollowUpEntityType | '';
  status: (typeof FOLLOW_UP_STATUS_VALUES)[number] | '';
  page: number;
}) => {
  const nextSearchParams = new URLSearchParams();
  if (search.trim()) {
    nextSearchParams.set('search', search.trim());
  }
  if (entityType) {
    nextSearchParams.set('entity_type', entityType);
  }
  if (status) {
    nextSearchParams.set('status', status);
  }
  if (page > 1) {
    nextSearchParams.set('page', String(page));
  }
  return nextSearchParams;
};

const getFollowUpStatusBadgeClass = (status: FollowUpWithEntity['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-[var(--loop-green)] text-black';
    case 'cancelled':
      return 'bg-[var(--loop-pink)] text-black';
    case 'overdue':
      return 'bg-[var(--loop-yellow)] text-black';
    default:
      return 'bg-[var(--loop-blue)] text-black';
  }
};

export default function FollowUpsPage() {
  const dispatch = useAppDispatch();
  const { showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { followUps, summary, loading, pagination, error } = useAppSelector((state) => state.followUps);
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();

  const search = searchParams.get('search') || '';
  const entityTypeFilter =
    parseAllowedValue(searchParams.get('entity_type'), FOLLOW_UP_ENTITY_TYPE_VALUES) || '';
  const statusFilter =
    parseAllowedValue(searchParams.get('status'), FOLLOW_UP_STATUS_VALUES) || '';
  const page = parsePositiveInteger(searchParams.get('page'), 1);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpWithEntity | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEntityType, setNewEntityType] = useState<FollowUpEntityType>('case');
  const [newEntityOption, setNewEntityOption] = useState<FollowUpEntityOption | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUpWithEntity | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const filters: FollowUpFilters = useMemo(
    () => ({
      entity_type: entityTypeFilter || undefined,
      status: statusFilter || undefined,
    }),
    [entityTypeFilter, statusFilter]
  );

  useEffect(() => {
    const normalizedSearchParams = buildFollowUpSearchParams({
      search,
      entityType: entityTypeFilter,
      status: statusFilter,
      page,
    });
    if (normalizedSearchParams.toString() !== searchParamsString) {
      setSearchParams(normalizedSearchParams, { replace: true });
    }
  }, [entityTypeFilter, page, search, searchParamsString, setSearchParams, statusFilter]);

  useEffect(() => {
    dispatch(fetchFollowUps({ filters, page, limit: PAGE_SIZE }));
    dispatch(fetchFollowUpSummary(filters));
  }, [dispatch, filters, page]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) {
      return followUps;
    }

    const needle = search.trim().toLowerCase();
    return followUps.filter((followUp) => {
      const haystack = [
        followUp.title,
        followUp.description,
        followUp.assigned_to_name,
        followUp.case_title,
        followUp.case_number,
        followUp.task_subject,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [followUps, search]);

  const refresh = async () => {
    await dispatch(fetchFollowUps({ filters, page, limit: PAGE_SIZE }));
    await dispatch(fetchFollowUpSummary(filters));
  };

  const updateListSearchParams = (
    patch: Partial<{
      search: string;
      entityType: FollowUpEntityType | '';
      status: (typeof FOLLOW_UP_STATUS_VALUES)[number] | '';
      page: number;
    }>
  ) => {
    setSearchParams(
      buildFollowUpSearchParams({
        search: patch.search ?? search,
        entityType: patch.entityType ?? entityTypeFilter,
        status: patch.status ?? statusFilter,
        page: patch.page ?? page,
      }),
      { replace: true }
    );
  };

  const handleComplete = async (followUpId: string) => {
    try {
      await dispatch(completeFollowUp({ followUpId, data: {} })).unwrap();
      await refresh();
    } catch (error) {
      showError(getFollowUpErrorMessage(error, 'Failed to complete follow-up'));
    }
  };

  const handleCancelFollowUp = async (followUpId: string) => {
    try {
      await dispatch(cancelFollowUp({ followUpId, data: {} })).unwrap();
      await refresh();
    } catch (error) {
      showError(getFollowUpErrorMessage(error, 'Failed to cancel follow-up'));
    }
  };

  const handleDelete = async (followUpId: string) => {
    const confirmed = await confirm(confirmPresets.delete('Follow-up'));
    if (!confirmed) return;

    try {
      await dispatch(deleteFollowUp(followUpId)).unwrap();
      await refresh();
    } catch (error) {
      showError(getFollowUpErrorMessage(error, 'Failed to delete follow-up'));
    }
  };

  const handleSaveReschedule = async (scheduledDate: string, scheduledTime?: string) => {
    if (!rescheduleTarget) {
      return;
    }

    try {
      setIsRescheduling(true);
      await dispatch(
        rescheduleFollowUp({
          followUpId: rescheduleTarget.id,
          newDate: scheduledDate,
          newTime: scheduledTime,
        })
      ).unwrap();
      await refresh();
      setRescheduleTarget(null);
    } catch (error) {
      showError(getFollowUpErrorMessage(error, 'Failed to reschedule follow-up'));
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <NeoBrutalistLayout pageTitle="FOLLOW-UPS">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--app-text)]">Follow-ups</h1>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Manage reminders and next-step actions across cases and tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] text-app-brutal-ink font-bold shadow-[3px_3px_0px_0px_var(--shadow-color)]"
          >
            {showCreateForm ? 'Hide Create Form' : 'Create Follow-up'}
          </button>
        </div>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-green)] text-app-brutal-ink"><p className="text-xs font-bold">Total</p><p className="text-2xl font-black">{summary.total}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-blue)] text-app-brutal-ink"><p className="text-xs font-bold">Scheduled</p><p className="text-2xl font-black">{summary.scheduled}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-cyan)] text-app-brutal-ink"><p className="text-xs font-bold">Completed</p><p className="text-2xl font-black">{summary.completed}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-pink)] text-app-brutal-ink"><p className="text-xs font-bold">Cancelled</p><p className="text-2xl font-black">{summary.cancelled}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-app-accent-soft text-[var(--app-text-heading)]"><p className="text-xs font-bold">Overdue</p><p className="text-2xl font-black">{summary.overdue}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] text-app-brutal-ink"><p className="text-xs font-bold">Due Today</p><p className="text-2xl font-black">{summary.due_today}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--app-surface-muted)] text-[var(--app-text-heading)]"><p className="text-xs font-bold">Next 7 Days</p><p className="text-2xl font-black">{summary.due_this_week}</p></div>
          </div>
        )}

        {showCreateForm && (
          <div className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <FollowUpEntityPicker
              entityType={newEntityType}
              selectedOption={newEntityOption}
              onEntityTypeChange={(nextType) => {
                setNewEntityType(nextType);
                setNewEntityOption(null);
              }}
              onSelect={setNewEntityOption}
            />

            {newEntityOption ? (
              <div className="mt-3">
                <FollowUpForm
                  entityType={newEntityOption.entityType}
                  entityId={newEntityOption.entityId}
                  onSuccess={async () => {
                    await refresh();
                    setShowCreateForm(false);
                    setNewEntityOption(null);
                  }}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                Search and select a case or task to create a follow-up.
              </p>
            )}
          </div>
        )}

        {editingFollowUp && (
          <div className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-black text-[var(--app-text-heading)]">Edit Follow-up</h2>
              <button
                type="button"
                onClick={() => setEditingFollowUp(null)}
                className="border-2 border-[var(--app-border)] px-3 py-1 text-xs font-bold text-[var(--app-text-heading)]"
              >
                Close
              </button>
            </div>
            <FollowUpForm
              entityType={editingFollowUp.entity_type}
              entityId={editingFollowUp.entity_id}
              existingFollowUp={editingFollowUp}
              onSuccess={async () => {
                setEditingFollowUp(null);
                await refresh();
              }}
            />
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            aria-label="Search follow-ups"
            value={search}
            onChange={(event) => updateListSearchParams({ search: event.target.value, page: 1 })}
            placeholder="Search follow-ups"
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
          />
          <select
            aria-label="Filter follow-ups by entity type"
            value={entityTypeFilter}
            onChange={(event) => {
              updateListSearchParams({
                entityType: event.target.value as FollowUpEntityType | '',
                page: 1,
              });
            }}
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
          >
            <option value="">All Entities</option>
            <option value="case">Cases</option>
            <option value="task">Tasks</option>
          </select>
          <select
            aria-label="Filter follow-ups by status"
            value={statusFilter}
            onChange={(event) => {
              updateListSearchParams({
                status: event.target.value as typeof statusFilter,
                page: 1,
              });
            }}
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            type="button"
            onClick={() => {
              updateListSearchParams({
                search: '',
                entityType: '',
                status: '',
                page: 1,
              });
            }}
            className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-3 py-2 font-bold text-app-brutal-ink"
          >
            Clear Filters
          </button>
        </div>

        {error && (
          <div className="mb-4 border-2 border-app-accent bg-app-accent-soft p-3 text-sm font-bold text-app-accent-text">
            {error}
          </div>
        )}

        <div className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
          <div className="space-y-3 p-4 md:hidden">
            {loading ? (
              <div className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-6 text-sm">
                Loading follow-ups...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-6 text-sm">
                No follow-ups found.
              </div>
            ) : (
              filteredRows.map((followUp) => (
                <div
                  key={followUp.id}
                  data-testid="mobile-follow-up-card"
                  className="rounded-[var(--ui-radius-md)] border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[2px_2px_0px_0px_var(--shadow-color)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{followUp.title}</div>
                      {followUp.description ? (
                        <div className="mt-1 text-xs text-[var(--app-text-muted)]">
                          {followUp.description}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${getFollowUpStatusBadgeClass(
                        followUp.status
                      )}`}
                    >
                      {followUp.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-[var(--app-text)]">
                    <p>
                      Entity:{' '}
                      <Link className="underline" to={getEntityHref(followUp)}>
                        {getEntityLabel(followUp)}
                      </Link>
                    </p>
                    <p>When: {formatDateTime(followUp)}</p>
                    <p>Assigned: {followUp.assigned_to_name || 'Unassigned'}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {followUp.status === 'scheduled' && (
                      <>
                        <button type="button" onClick={() => void handleComplete(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">
                          Complete
                        </button>
                        <button type="button" onClick={() => void handleCancelFollowUp(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">
                          Cancel
                        </button>
                        <button type="button" onClick={() => setRescheduleTarget(followUp)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">
                          Reschedule
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => setEditingFollowUp(followUp)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDelete(followUp.id)} className="border-2 border-app-accent bg-app-accent-soft px-2 py-1 text-xs font-bold text-app-accent-text">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-[var(--app-border)] text-sm">
            <thead className="bg-[var(--app-surface-muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-black uppercase">Title</th>
                <th className="px-3 py-2 text-left font-black uppercase">Entity</th>
                <th className="px-3 py-2 text-left font-black uppercase">When</th>
                <th className="px-3 py-2 text-left font-black uppercase">Assigned</th>
                <th className="px-3 py-2 text-left font-black uppercase">Status</th>
                <th className="px-3 py-2 text-left font-black uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6" colSpan={6}>Loading follow-ups...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td className="px-3 py-6" colSpan={6}>No follow-ups found.</td></tr>
              ) : (
                filteredRows.map((followUp) => (
                  <tr key={followUp.id} className="border-t border-[var(--app-border)]">
                    <td className="px-3 py-2">
                      <div className="font-bold">{followUp.title}</div>
                      {followUp.description && (
                        <div className="text-xs text-[var(--app-text-muted)]">{followUp.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link to={getEntityHref(followUp)} className="underline">
                        {getEntityLabel(followUp)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatDateTime(followUp)}</td>
                    <td className="px-3 py-2">{followUp.assigned_to_name || 'Unassigned'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${getFollowUpStatusBadgeClass(
                          followUp.status
                        )}`}
                      >
                        {followUp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {followUp.status === 'scheduled' && (
                          <>
                            <button type="button" onClick={() => void handleComplete(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Complete</button>
                            <button type="button" onClick={() => void handleCancelFollowUp(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Cancel</button>
                            <button type="button" onClick={() => setRescheduleTarget(followUp)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Reschedule</button>
                          </>
                        )}
                        <button type="button" onClick={() => setEditingFollowUp(followUp)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Edit</button>
                        <button type="button" onClick={() => void handleDelete(followUp.id)} className="border-2 border-app-accent bg-app-accent-soft px-2 py-1 text-xs font-bold text-app-accent-text">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>

        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateListSearchParams({ page: Math.max(1, page - 1) })}
              className="border-2 border-[var(--app-border)] px-3 py-2 font-bold disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm font-bold">
              Page {pagination.page} of {pagination.pages}
            </p>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => updateListSearchParams({ page: Math.min(pagination.pages, page + 1) })}
              className="border-2 border-[var(--app-border)] px-3 py-2 font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      <RescheduleFollowUpDialog
        isOpen={Boolean(rescheduleTarget)}
        followUpTitle={rescheduleTarget?.title}
        initialDate={rescheduleTarget?.scheduled_date}
        initialTime={rescheduleTarget?.scheduled_time}
        isSaving={isRescheduling}
        onConfirm={handleSaveReschedule}
        onCancel={() => setRescheduleTarget(null)}
      />
    </NeoBrutalistLayout>
  );
}
