/**
 * TaskList Page
 * Displays a list of tasks with filtering and summary statistics
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTasks, deleteTask, completeTask } from '../store/slices/tasksSlice';
import { TaskStatus, TaskPriority } from '../types/task';
import type { TaskFilters } from '../types/task';

type TaskListFilters = {
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  overdue: boolean;
  page: number;
};

const TaskList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tasks, pagination, summary, loading, error } = useAppSelector((state) => state.tasks);

  const [filters, setFilters] = useState<TaskListFilters>({
    search: '',
    status: '',
    priority: '',
    overdue: false,
    page: 1,
  });

  const buildRequestFilters = (current: TaskListFilters): TaskFilters => ({
    ...current,
    status: current.status || undefined,
    priority: current.priority || undefined,
  });

  useEffect(() => {
    dispatch(fetchTasks(buildRequestFilters(filters)));
  }, [dispatch, filters]);

  const handleFilterChange = <K extends keyof TaskListFilters>(
    key: K,
    value: TaskListFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await dispatch(deleteTask(id));
      dispatch(fetchTasks(buildRequestFilters(filters)));
    }
  };

  const handleComplete = async (id: string) => {
    await dispatch(completeTask(id));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED) {
      return false;
    }
    return new Date(dueDate) < new Date();
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <button
          onClick={() => navigate('/tasks/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-red-600 text-sm font-medium">Overdue</div>
            <div className="text-2xl font-bold text-red-900">{summary.overdue}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-yellow-600 text-sm font-medium">Due Today</div>
            <div className="text-2xl font-bold text-yellow-900">{summary.due_today}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <div className="text-blue-600 text-sm font-medium">Due This Week</div>
            <div className="text-2xl font-bold text-blue-900">{summary.due_this_week}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-green-600 text-sm font-medium">Total Tasks</div>
            <div className="text-2xl font-bold text-green-900">{pagination.total}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-4 py-2 border rounded-md"
            aria-label="Search tasks"
          />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value as TaskStatus | '')}
            className="px-4 py-2 border rounded-md"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value={TaskStatus.NOT_STARTED}>Not Started</option>
            <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
            <option value={TaskStatus.WAITING}>Waiting</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
            <option value={TaskStatus.DEFERRED}>Deferred</option>
            <option value={TaskStatus.CANCELLED}>Cancelled</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value as TaskPriority | '')}
            className="px-4 py-2 border rounded-md"
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.NORMAL}>Normal</option>
            <option value={TaskPriority.HIGH}>High</option>
            <option value={TaskPriority.URGENT}>Urgent</option>
          </select>
          <label className="flex items-center px-4 py-2 border rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) => handleFilterChange('overdue', e.target.checked)}
              className="mr-2"
              aria-label="Show overdue only"
            />
            <span>Overdue Only</span>
          </label>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No tasks found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{task.subject}</div>
                    {task.related_to_name && (
                      <div className="text-sm text-gray-500">
                        Related to: {task.related_to_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                  <td className="px-6 py-4">{getPriorityBadge(task.priority)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {task.assigned_to_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`text-sm ${
                        isOverdue(task.due_date, task.status)
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-900'
                      }`}
                    >
                      {formatDate(task.due_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    {task.status !== TaskStatus.COMPLETED && (
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/tasks/${task.id}/edit`)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-4 flex justify-center">
          <nav className="inline-flex rounded-md shadow">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handleFilterChange('page', page)}
                className={`px-4 py-2 text-sm font-medium ${
                  pagination.page === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border border-gray-300`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default TaskList;
