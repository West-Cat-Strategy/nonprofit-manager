import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import FollowUpForm from '../../../components/FollowUpForm';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  cancelFollowUp,
  completeFollowUp,
  deleteFollowUp,
  fetchFollowUpSummary,
  fetchFollowUps,
  rescheduleFollowUp,
} from '../../../store/slices/followUpsSlice';
import type { FollowUpEntityType, FollowUpWithEntity, FollowUpFilters } from '../../../types/followup';

const PAGE_SIZE = 20;

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

export default function FollowUpsPage() {
  const dispatch = useAppDispatch();
  const { followUps, summary, loading, pagination, error } = useAppSelector((state) => state.followUps);

  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState<FollowUpEntityType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'scheduled' | 'completed' | 'cancelled' | 'overdue' | ''>('');
  const [search, setSearch] = useState('');
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpWithEntity | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEntityType, setNewEntityType] = useState<FollowUpEntityType>('case');
  const [newEntityId, setNewEntityId] = useState('');

  const filters: FollowUpFilters = useMemo(
    () => ({
      entity_type: entityTypeFilter || undefined,
      status: statusFilter || undefined,
    }),
    [entityTypeFilter, statusFilter]
  );

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

  const handleComplete = async (followUpId: string) => {
    await dispatch(completeFollowUp({ followUpId, data: {} }));
    await refresh();
  };

  const handleCancel = async (followUpId: string) => {
    await dispatch(cancelFollowUp(followUpId));
    await refresh();
  };

  const handleReschedule = async (followUpId: string) => {
    const nextDate = window.prompt('New scheduled date (YYYY-MM-DD):');
    if (!nextDate) return;
    await dispatch(rescheduleFollowUp({ followUpId, newDate: nextDate }));
    await refresh();
  };

  const handleDelete = async (followUpId: string) => {
    if (!window.confirm('Delete this follow-up?')) return;
    await dispatch(deleteFollowUp(followUpId));
    await refresh();
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
            className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] text-black font-bold shadow-[3px_3px_0px_0px_var(--shadow-color)]"
          >
            {showCreateForm ? 'Hide Create Form' : 'Create Follow-up'}
          </button>
        </div>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-green)]"><p className="text-xs font-bold">Total</p><p className="text-2xl font-black">{summary.total}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-blue)]"><p className="text-xs font-bold">Scheduled</p><p className="text-2xl font-black">{summary.scheduled}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-cyan)]"><p className="text-xs font-bold">Completed</p><p className="text-2xl font-black">{summary.completed}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-pink)]"><p className="text-xs font-bold">Cancelled</p><p className="text-2xl font-black">{summary.cancelled}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-red-100"><p className="text-xs font-bold">Overdue</p><p className="text-2xl font-black">{summary.overdue}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)]"><p className="text-xs font-bold">Due Today</p><p className="text-2xl font-black">{summary.due_today}</p></div>
            <div className="p-3 border-2 border-[var(--app-border)] bg-[var(--app-surface-muted)]"><p className="text-xs font-bold">Next 7 Days</p><p className="text-2xl font-black">{summary.due_this_week}</p></div>
          </div>
        )}

        {showCreateForm && (
          <div className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <div className="mb-3 grid gap-3 md:grid-cols-3">
              <label className="flex flex-col text-sm font-bold">
                Entity Type
                <select
                  value={newEntityType}
                  onChange={(event) => setNewEntityType(event.target.value as FollowUpEntityType)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="case">Case</option>
                  <option value="task">Task</option>
                </select>
              </label>
              <label className="md:col-span-2 flex flex-col text-sm font-bold">
                Entity ID
                <input
                  value={newEntityId}
                  onChange={(event) => setNewEntityId(event.target.value)}
                  placeholder="UUID of the case/task"
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
            </div>

            {newEntityId ? (
              <FollowUpForm
                entityType={newEntityType}
                entityId={newEntityId}
                onSuccess={async () => {
                  await refresh();
                  setShowCreateForm(false);
                  setNewEntityId('');
                }}
              />
            ) : (
              <p className="text-sm text-[var(--app-text-muted)]">
                Enter an entity ID to create a follow-up. You can also create follow-ups directly from case or task detail pages.
              </p>
            )}
          </div>
        )}

        {editingFollowUp && (
          <div className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-black">Edit Follow-up</h2>
              <button
                type="button"
                onClick={() => setEditingFollowUp(null)}
                className="border-2 border-[var(--app-border)] px-3 py-1 text-xs font-bold"
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search follow-ups"
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
          />
          <select
            value={entityTypeFilter}
            onChange={(event) => {
              setEntityTypeFilter(event.target.value as FollowUpEntityType | '');
              setPage(1);
            }}
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
          >
            <option value="">All Entities</option>
            <option value="case">Cases</option>
            <option value="task">Tasks</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as typeof statusFilter);
              setPage(1);
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
              setSearch('');
              setEntityTypeFilter('');
              setStatusFilter('');
              setPage(1);
            }}
            className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-3 py-2 font-bold"
          >
            Clear Filters
          </button>
        </div>

        {error && (
          <div className="mb-4 border-2 border-red-600 bg-red-100 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
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
                    <td className="px-3 py-2 uppercase font-bold">{followUp.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {followUp.status === 'scheduled' && (
                          <>
                            <button type="button" onClick={() => void handleComplete(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Complete</button>
                            <button type="button" onClick={() => void handleCancel(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Cancel</button>
                            <button type="button" onClick={() => void handleReschedule(followUp.id)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Reschedule</button>
                          </>
                        )}
                        <button type="button" onClick={() => setEditingFollowUp(followUp)} className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold">Edit</button>
                        <button type="button" onClick={() => void handleDelete(followUp.id)} className="border-2 border-red-600 bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
              className="border-2 border-[var(--app-border)] px-3 py-2 font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}
