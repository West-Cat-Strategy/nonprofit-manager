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

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedTask, loading, error } = useAppSelector((state) => state.tasks);

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
    }
  }, [id, dispatch]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      if (id) {
        await dispatch(deleteTask(id));
        navigate('/tasks');
      }
    }
  };

  const handleComplete = async () => {
    if (id) {
      await dispatch(completeTask(id));
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: TaskStatus) => {
    const statusColors: Record<TaskStatus, string> = {
      [TaskStatus.NOT_STARTED]: 'bg-gray-100 text-gray-800',
      [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
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
      [TaskPriority.LOW]: 'bg-gray-100 text-gray-600',
      [TaskPriority.NORMAL]: 'bg-blue-100 text-blue-600',
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
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">Error: {error}</div>
      </div>
    );
  }

  if (!selectedTask) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">Task not found</div>
      </div>
    );
  }

  const isOverdue =
    selectedTask.due_date &&
    new Date(selectedTask.due_date) < new Date() &&
    selectedTask.status !== TaskStatus.COMPLETED &&
    selectedTask.status !== TaskStatus.CANCELLED;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Tasks
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedTask.subject}</h1>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Task Information</h2>
          <dl className="space-y-3">
            {selectedTask.description && (
              <>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900 mb-3">{selectedTask.description}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-gray-500">Due Date</dt>
            <dd className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
              {formatDateTime(selectedTask.due_date)}
            </dd>
            {selectedTask.completed_date && (
              <>
                <dt className="text-sm font-medium text-gray-500">Completed Date</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(selectedTask.completed_date)}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
            <dd className="text-sm text-gray-900">
              {selectedTask.assigned_to_name || 'Unassigned'}
            </dd>
          </dl>
        </div>

        {/* Related Information */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Related Information</h2>
          <dl className="space-y-3">
            {selectedTask.related_to_type && selectedTask.related_to_name && (
              <>
                <dt className="text-sm font-medium text-gray-500">Related To</dt>
                <dd className="text-sm text-gray-900">
                  <span className="capitalize">{selectedTask.related_to_type}</span>:{' '}
                  {selectedTask.related_to_name}
                </dd>
              </>
            )}
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-sm text-gray-900">{formatDateTime(selectedTask.created_at)}</dd>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="text-sm text-gray-900">{formatDateTime(selectedTask.updated_at)}</dd>
          </dl>
        </div>
      </div>

      {/* Follow-ups Section */}
      {id && (
        <div className="mt-6 bg-white shadow-md rounded-lg p-6">
          <FollowUpList entityType="task" entityId={id} />
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
