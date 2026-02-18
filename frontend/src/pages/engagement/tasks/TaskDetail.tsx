/**
 * TaskDetail Page
 * Displays detailed information about a single task
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchTaskById, deleteTask, completeTask } from '../../../store/slices/tasksSlice';
import { TaskStatus, TaskPriority } from '../../../types/task';
import FollowUpList from '../../../components/FollowUpList';
import { formatDateTime } from '../../../utils/format';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const dispatch = useAppDispatch();
  const { selectedTask, loading, error } = useAppSelector((state) => state.tasks);

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
    }
  }, [id, dispatch]);

  const handleDelete = async () => {
    const confirmed = await confirm(confirmPresets.delete('Task'));
    if (!confirmed || !id) return;
    await dispatch(deleteTask(id));
    navigate('/tasks');
  };

  const handleComplete = async () => {
    if (id) {
      await dispatch(completeTask(id));
    }
  };

  const formatDateTimeOrNA = (dateString: string | null) => {
    return dateString ? formatDateTime(dateString) : 'N/A';
  };

  const getStatusBadge = (status: TaskStatus) => {
    const statusColors: Record<TaskStatus, string> = {
      [TaskStatus.NOT_STARTED]: 'bg-app-surface-muted text-app-text',
      [TaskStatus.IN_PROGRESS]: 'bg-app-accent-soft text-app-accent-text',
      [TaskStatus.WAITING]: 'bg-yellow-100 text-yellow-800',
      [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [TaskStatus.DEFERRED]: 'bg-purple-100 text-purple-800',
      [TaskStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const priorityColors: Record<TaskPriority, string> = {
      [TaskPriority.LOW]: 'bg-app-surface-muted text-app-text-muted',
      [TaskPriority.NORMAL]: 'bg-app-accent-soft text-app-accent',
      [TaskPriority.HIGH]: 'bg-orange-100 text-orange-600',
      [TaskPriority.URGENT]: 'bg-red-100 text-red-600',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-app-text-muted">Loading...</div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (error) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-100 text-red-700 rounded-md">Error: {error}</div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (!selectedTask) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="container mx-auto px-4 py-8">
          <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">Task not found</div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  const isOverdue =
    selectedTask.due_date &&
    new Date(selectedTask.due_date) < new Date() &&
    selectedTask.status !== TaskStatus.COMPLETED &&
    selectedTask.status !== TaskStatus.CANCELLED;

  return (
    <NeoBrutalistLayout pageTitle="TASKS">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="text-app-accent hover:text-app-accent-text mb-4"
        >
          ← Back to Tasks
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-app-text mb-2">{selectedTask.subject}</h1>
            <div className="flex gap-2 items-center">
              {getStatusBadge(selectedTask.status)}
              {getPriorityBadge(selectedTask.priority)}
              {isOverdue && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  OVERDUE
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {selectedTask.status !== TaskStatus.COMPLETED && (
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Mark Complete
              </button>
            )}
            <button
              onClick={() => navigate(`/tasks/${id}/edit`)}
              className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task Information */}
        <div className="bg-app-surface shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Task Information</h2>
          <dl className="space-y-3">
            {selectedTask.description && (
              <>
                <dt className="text-sm font-medium text-app-text-muted">Description</dt>
                <dd className="text-sm text-app-text mb-3">{selectedTask.description}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-app-text-muted">Due Date</dt>
            <dd className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-app-text'}`}>
              {formatDateTimeOrNA(selectedTask.due_date)}
            </dd>
            {selectedTask.completed_date && (
              <>
                <dt className="text-sm font-medium text-app-text-muted">Completed Date</dt>
                <dd className="text-sm text-app-text">{formatDateTimeOrNA(selectedTask.completed_date)}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-app-text-muted">Assigned To</dt>
            <dd className="text-sm text-app-text">
              {selectedTask.assigned_to_name || 'Unassigned'}
            </dd>
          </dl>
        </div>

        {/* Related Information */}
        <div className="bg-app-surface shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Related Information</h2>
          <dl className="space-y-3">
            {selectedTask.related_to_type && selectedTask.related_to_name && (
              <>
                <dt className="text-sm font-medium text-app-text-muted">Related To</dt>
                <dd className="text-sm text-app-text">
                  <span className="capitalize">{selectedTask.related_to_type}</span>:{' '}
                  {selectedTask.related_to_name}
                </dd>
              </>
            )}
            <dt className="text-sm font-medium text-app-text-muted">Created</dt>
            <dd className="text-sm text-app-text">{formatDateTime(selectedTask.created_at)}</dd>
            <dt className="text-sm font-medium text-app-text-muted">Last Updated</dt>
            <dd className="text-sm text-app-text">{formatDateTime(selectedTask.updated_at)}</dd>
          </dl>
        </div>
      </div>

      {/* Follow-ups Section */}
      {id && (
        <div className="mt-6 bg-app-surface shadow-md rounded-lg p-6">
          <FollowUpList entityType="task" entityId={id} />
        </div>
      )}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
};

export default TaskDetail;
