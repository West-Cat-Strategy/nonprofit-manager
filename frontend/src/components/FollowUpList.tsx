/**
 * Follow-up List Component
 * Displays and manages follow-ups for cases and tasks
 */

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchEntityFollowUps,
  completeFollowUp,
  cancelFollowUp,
  deleteFollowUp,
  clearEntityFollowUps,
  rescheduleFollowUp,
} from '../store/slices/followUpsSlice';
import { useToast } from '../contexts/useToast';
import FollowUpForm from './FollowUpForm';
import type { FollowUp, FollowUpEntityType } from '../types/followup';
import { formatDate, formatTimeString } from '../utils/format';

interface FollowUpListProps {
  entityType: FollowUpEntityType;
  entityId: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-app-accent-soft text-app-accent-text',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-app-surface-muted text-app-text-muted',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const METHOD_ICONS: Record<string, string> = {
  phone: '📞',
  email: '✉️',
  in_person: '🤝',
  video_call: '📹',
  other: '📋',
};

function isOverdue(followUp: FollowUp): boolean {
  if (followUp.status !== 'scheduled') return false;
  const now = new Date();
  const scheduled = new Date(followUp.scheduled_date);
  if (followUp.scheduled_time) {
    const [hours, minutes] = followUp.scheduled_time.split(':');
    scheduled.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  } else {
    scheduled.setHours(23, 59, 59);
  }
  return now > scheduled;
}

export default function FollowUpList({ entityType, entityId }: FollowUpListProps) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { entityFollowUps, entityLoading } = useAppSelector((state) => state.followUps);

  const [showForm, setShowForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'overdue'>('all');

  useEffect(() => {
    dispatch(fetchEntityFollowUps({ entityType, entityId }));
    return () => {
      dispatch(clearEntityFollowUps());
    };
  }, [dispatch, entityType, entityId]);

  const handleComplete = async (followUp: FollowUp) => {
    if (completingId === followUp.id) {
      // Submit completion
      try {
        await dispatch(
          completeFollowUp({
            followUpId: followUp.id,
            data: { completed_notes: completionNotes || undefined },
          })
        ).unwrap();
        showSuccess('Follow-up marked as complete');
        setCompletingId(null);
        setCompletionNotes('');
      } catch {
        showError('Failed to complete follow-up');
      }
    } else {
      // Show completion notes input
      setCompletingId(followUp.id);
      setCompletionNotes('');
    }
  };

  const handleCancel = async (followUpId: string) => {
    if (!window.confirm('Are you sure you want to cancel this follow-up?')) return;
    try {
      await dispatch(cancelFollowUp(followUpId)).unwrap();
      showSuccess('Follow-up cancelled');
    } catch {
      showError('Failed to cancel follow-up');
    }
  };

  const handleDelete = async (followUpId: string) => {
    if (!window.confirm('Are you sure you want to delete this follow-up? This cannot be undone.')) return;
    try {
      await dispatch(deleteFollowUp(followUpId)).unwrap();
      showSuccess('Follow-up deleted');
    } catch {
      showError('Failed to delete follow-up');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingFollowUp(null);
    dispatch(fetchEntityFollowUps({ entityType, entityId }));
  };

  const handleEdit = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setShowForm(true);
  };

  const handleQuickReschedule = async (followUpId: string, days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const newDate = target.toISOString().split('T')[0];
    try {
      await dispatch(rescheduleFollowUp({ followUpId, newDate })).unwrap();
      showSuccess('Follow-up rescheduled');
    } catch {
      showError('Failed to reschedule follow-up');
    }
  };

  // Sort: scheduled first (by date), then completed/cancelled
  const sortedFollowUps = [...entityFollowUps].sort((a, b) => {
    const statusOrder = { scheduled: 0, overdue: 0, completed: 1, cancelled: 2 };
    const aStatus = isOverdue(a) ? 'overdue' : a.status;
    const bStatus = isOverdue(b) ? 'overdue' : b.status;
    if (statusOrder[aStatus] !== statusOrder[bStatus]) {
      return statusOrder[aStatus] - statusOrder[bStatus];
    }
    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
  });

  const filteredFollowUps = sortedFollowUps.filter((followUp) => {
    if (statusFilter === 'all') return true;
    const overdueStatus = isOverdue(followUp);
    if (statusFilter === 'overdue') return overdueStatus;
    return followUp.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold text-app-text-heading">
          Follow-ups
        </h3>
        <div className="flex flex-wrap gap-2">
          {(['all', 'scheduled', 'overdue', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                statusFilter === status
                  ? 'bg-app-accent text-white'
                  : 'bg-app-surface text-app-text-muted'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
          <button
            onClick={() => {
              setEditingFollowUp(null);
              setShowForm(!showForm);
            }}
            className="px-3 py-1.5 text-sm font-semibold bg-app-accent text-white rounded-lg hover:bg-app-accent-hover transition-colors"
          >
            {showForm ? 'Cancel' : '+ Schedule Follow-up'}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 bg-app-surface-muted rounded-lg border-2 border-app-border">
          <h4 className="text-md font-semibold text-app-text-heading mb-4">
            {editingFollowUp ? 'Edit Follow-up' : 'Schedule New Follow-up'}
          </h4>
          <FollowUpForm
            entityType={entityType}
            entityId={entityId}
            existingFollowUp={editingFollowUp}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingFollowUp(null);
            }}
          />
        </div>
      )}

      {/* List */}
      {entityLoading ? (
        <div className="py-8 text-center text-app-text-muted">
          <div className="animate-spin w-6 h-6 border-2 border-app-border border-t-app-accent rounded-full mx-auto mb-2" />
          Loading follow-ups...
        </div>
      ) : filteredFollowUps.length === 0 ? (
        <div className="py-8 text-center text-app-text-muted">
          <p>No follow-ups scheduled</p>
          <p className="text-sm mt-1">Click "Schedule Follow-up" to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFollowUps.map((followUp) => {
            const overdueStatus = isOverdue(followUp);
            const displayStatus = overdueStatus ? 'overdue' : followUp.status;

            return (
              <div
                key={followUp.id}
                className={`p-4 rounded-lg border-2 ${
                  overdueStatus
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                    : 'border-app-border bg-app-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {followUp.method && (
                        <span className="text-lg" title={followUp.method}>
                          {METHOD_ICONS[followUp.method] || '📋'}
                        </span>
                      )}
                      <h4 className="font-semibold text-app-text-heading">
                        {followUp.title}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[displayStatus]}`}>
                        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                      </span>
                      {followUp.frequency !== 'once' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                          {followUp.frequency}
                        </span>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="mt-1 text-sm text-app-text-muted">
                      <span>{formatDate(followUp.scheduled_date)}</span>
                      {followUp.scheduled_time && (
                        <span className="ml-2">at {formatTimeString(followUp.scheduled_time)}</span>
                      )}
                      {followUp.assigned_to_name && (
                        <span className="ml-2">• Assigned to {followUp.assigned_to_name}</span>
                      )}
                    </div>

                    {/* Description */}
                    {followUp.description && (
                      <p className="mt-2 text-sm text-app-text-muted">
                        {followUp.description}
                      </p>
                    )}

                    {/* Completion notes input */}
                    {completingId === followUp.id && (
                      <div className="mt-3">
                        <textarea
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          placeholder="Add completion notes (optional)..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border-2 border-app-input-border rounded-lg bg-app-input-bg text-app-text-heading"
                        />
                      </div>
                    )}

                    {/* Completed notes display */}
                    {followUp.status === 'completed' && followUp.completed_notes && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 rounded text-sm text-green-800 dark:text-green-200">
                        <span className="font-medium">Completion notes:</span> {followUp.completed_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    {followUp.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => handleComplete(followUp)}
                          className="px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors"
                        >
                          {completingId === followUp.id ? 'Save' : '✓ Complete'}
                        </button>
                        {completingId !== followUp.id && (
                          <button
                            onClick={() => handleQuickReschedule(followUp.id, 1)}
                            className="px-2 py-1 text-xs font-medium text-app-text-muted hover:bg-app-hover rounded transition-colors"
                          >
                            Reschedule +1d
                          </button>
                        )}
                        {completingId === followUp.id && (
                          <button
                            onClick={() => {
                              setCompletingId(null);
                              setCompletionNotes('');
                            }}
                            className="px-2 py-1 text-xs font-medium text-app-text-muted hover:bg-app-hover rounded transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {completingId !== followUp.id && (
                          <>
                            <button
                              onClick={() => handleEdit(followUp)}
                              className="px-2 py-1 text-xs font-medium text-app-accent-text hover:bg-app-accent-soft-hover rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancel(followUp.id)}
                              className="px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(followUp.id)}
                      className="px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
