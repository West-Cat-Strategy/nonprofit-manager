/**
 * TaskList Page
 * Displays a list of tasks with filtering and summary statistics
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchTasks, deleteTask, completeTask } from '../../../store/slices/tasksSlice';
import { TaskStatus, TaskPriority } from '../../../types/task';
import type { TaskFilters } from '../../../types/task';
import { formatDate } from '../../../utils/format';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

type TaskListFilters = {
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  overdue: boolean;
  page: number;
};

const TaskList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { tasks, pagination, summary, loading, error } = useAppSelector((state) => state.tasks);

  const [filters, setFilters] = useState<TaskListFilters>({
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as TaskStatus | '') || '',
    priority: (searchParams.get('priority') as TaskPriority | '') || '',
    overdue: searchParams.get('overdue') === 'true',
    page: Number(searchParams.get('page') || '1'),
  });
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.priority || filters.overdue);

  const buildRequestFilters = (current: TaskListFilters): TaskFilters => ({
    ...current,
    status: current.status || undefined,
    priority: current.priority || undefined,
  });

  useEffect(() => {
    dispatch(fetchTasks(buildRequestFilters(filters)));
  }, [dispatch, filters]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.overdue) params.set('overdue', 'true');
    if (filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = <K extends keyof TaskListFilters>(
    key: K,
    value: TaskListFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      overdue: false,
      page: 1,
    });
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

  const formatDueDate = (dateString: string | null) => {
    return dateString ? formatDate(dateString) : 'No due date';
  };

  const isOverdue = (dueDate: string | null, status: TaskStatus) => {
    if (!dueDate || status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED) {
      return false;
    }
    return new Date(dueDate) < new Date();
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  if (error) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-100 border-2 border-red-500 text-red-700 shadow-[4px_4px_0px_0px_var(--shadow-color)]">Error: {error}</div>
      </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="TASKS">
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-[var(--app-text)]">Tasks</h1>
        <button
          onClick={() => navigate('/tasks/new')}
          className="px-4 py-2 bg-[var(--loop-green)] text-black border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all font-bold uppercase"
        >
          + New Task
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-100 border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4">
            <div className="text-red-600 text-sm font-bold uppercase">Overdue</div>
            <div className="text-2xl font-black text-red-900">{summary.overdue}</div>
          </div>
          <div className="bg-[var(--loop-yellow)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4">
            <div className="text-black text-sm font-bold uppercase">Due Today</div>
            <div className="text-2xl font-black text-black">{summary.due_today}</div>
          </div>
          <div className="bg-[var(--loop-blue)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4">
            <div className="text-black text-sm font-bold uppercase">Due This Week</div>
            <div className="text-2xl font-black text-black">{summary.due_this_week}</div>
          </div>
          <div className="bg-[var(--loop-green)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4">
            <div className="text-black text-sm font-bold uppercase">Total Tasks</div>
            <div className="text-2xl font-black text-black">{pagination.total}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)]"
            aria-label="Search tasks"
          />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value as TaskStatus | '')}
            className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)]"
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
            className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)]"
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.NORMAL}>Normal</option>
            <option value={TaskPriority.HIGH}>High</option>
            <option value={TaskPriority.URGENT}>Urgent</option>
          </select>
          <label className="flex items-center px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)] cursor-pointer font-bold">
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
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.search && <button onClick={() => handleFilterChange('search', '')} className="px-2 py-1 text-xs border-2 border-[var(--app-border)]">Search: {filters.search} ×</button>}
            {filters.status && <button onClick={() => handleFilterChange('status', '')} className="px-2 py-1 text-xs border-2 border-[var(--app-border)]">Status: {filters.status} ×</button>}
            {filters.priority && <button onClick={() => handleFilterChange('priority', '')} className="px-2 py-1 text-xs border-2 border-[var(--app-border)]">Priority: {filters.priority} ×</button>}
            {filters.overdue && <button onClick={() => handleFilterChange('overdue', false)} className="px-2 py-1 text-xs border-2 border-[var(--app-border)]">Overdue ×</button>}
            <button onClick={clearFilters} className="px-2 py-1 text-xs font-bold border-2 border-[var(--app-border)] bg-[var(--loop-yellow)]">Clear all</button>
          </div>
        )}
      </div>

      {/* Task Table */}
      <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--app-text-muted)]">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-[var(--app-text-muted)]">
            <p>No tasks match your current filters.</p>
            <div className="mt-4 flex justify-center gap-3">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="px-3 py-2 border-2 border-[var(--app-border)] text-[var(--app-text)] font-bold">Clear Filters</button>
              )}
              <button onClick={() => navigate('/tasks/new')} className="px-3 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-green)] text-black font-bold">New Task</button>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[var(--app-border)]">
            <thead className="bg-[var(--app-surface-muted)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--app-surface)] divide-y divide-[var(--app-border)]">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-[var(--app-surface-muted)]">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[var(--app-text)]">{task.subject}</div>
                    {task.related_to_name && (
                      <div className="text-sm text-[var(--app-text-muted)]">
                        Related to: {task.related_to_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                  <td className="px-6 py-4">{getPriorityBadge(task.priority)}</td>
                  <td className="px-6 py-4 text-sm text-[var(--app-text)]">
                    {task.assigned_to_name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`text-sm ${
                        isOverdue(task.due_date, task.status)
                          ? 'text-red-600 font-semibold'
                          : 'text-[var(--app-text)]'
                      }`}
                    >
                      {formatDueDate(task.due_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold space-x-2">
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="text-[var(--app-accent-text)] hover:text-[var(--app-accent-text-hover)]"
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
                      className="text-[var(--app-accent-text)] hover:text-[var(--app-accent-text-hover)]"
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
          <nav className="inline-flex shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handleFilterChange('page', page)}
                className={`px-4 py-2 text-sm font-bold ${
                  pagination.page === page
                    ? 'bg-[var(--app-border)] text-[var(--app-bg)]'
                    : 'bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
                } border-2 border-[var(--app-border)]`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
    </NeoBrutalistLayout>
  );
};

export default TaskList;
