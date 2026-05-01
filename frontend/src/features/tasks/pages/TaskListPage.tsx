/**
 * TaskList Page
 * Displays a list of tasks with filtering and summary statistics
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchTasks, deleteTask, completeTask } from '../state';
import { TaskStatus, TaskPriority } from '../../../types/task';
import type { TaskFilters } from '../../../types/task';
import { formatDate } from '../../../utils/format';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import { useDebounce } from '../../../hooks/useVirtualList';
import {
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
  safeParseStoredObject,
} from '../../../utils/persistedFilters';

type TaskListFilters = {
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  overdue: boolean;
  page: number;
};

const TASK_FILTERS_STORAGE_KEY = 'tasks_list_filters_v1';
const TASK_STATUS_VALUES = Object.values(TaskStatus);
const TASK_PRIORITY_VALUES = Object.values(TaskPriority);
const taskActionLinkClass =
  'inline-flex items-center justify-center gap-2 border-2 border-[var(--app-border)] bg-[var(--loop-green)] px-4 py-2 font-bold uppercase text-black shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)]';
const taskGhostLinkClass =
  'border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-bold uppercase text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-muted)]';
const taskSummaryCardClass =
  'border-2 border-[var(--app-border)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--shadow-color)]';

const TaskList: React.FC = () => {
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { tasks, pagination, summary, loading, error } = useAppSelector((state) => state.tasks);

  const [filters, setFilters] = useState<TaskListFilters>(() => {
    const urlFilters: TaskListFilters = {
      search: searchParams.get('search') || '',
      status: parseAllowedValueOrEmpty(searchParams.get('status'), TASK_STATUS_VALUES),
      priority: parseAllowedValueOrEmpty(searchParams.get('priority'), TASK_PRIORITY_VALUES),
      overdue: searchParams.get('overdue') === 'true',
      page: parsePositiveInteger(searchParams.get('page'), 1),
    };

    const hasUrlFilters = Boolean(
      urlFilters.search ||
      urlFilters.status ||
      urlFilters.priority ||
      urlFilters.overdue ||
      urlFilters.page > 1
    );

    if (hasUrlFilters) {
      return urlFilters;
    }

    try {
      const parsed = safeParseStoredObject<Record<string, unknown>>(
        localStorage.getItem(TASK_FILTERS_STORAGE_KEY)
      );
      if (parsed) {
        return {
          search: typeof parsed.search === 'string' ? parsed.search : '',
          status: parseAllowedValueOrEmpty(parsed.status, TASK_STATUS_VALUES),
          priority: parseAllowedValueOrEmpty(parsed.priority, TASK_PRIORITY_VALUES),
          overdue: parsed.overdue === true,
          page: 1,
        };
      }
    } catch {
      localStorage.removeItem(TASK_FILTERS_STORAGE_KEY);
    }

    return urlFilters;
  });
  const debouncedSearch = useDebounce(filters.search, 300);
  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.priority || filters.overdue
  );

  const buildRequestFilters = (current: TaskListFilters): TaskFilters => ({
    ...current,
    search: current.search.trim() || undefined,
    status: current.status || undefined,
    priority: current.priority || undefined,
  });

  const requestFilters = useMemo(
    () =>
      buildRequestFilters({
        overdue: filters.overdue,
        page: filters.page,
        priority: filters.priority,
        search: debouncedSearch,
        status: filters.status,
      }),
    [debouncedSearch, filters.overdue, filters.page, filters.priority, filters.status]
  );

  useEffect(() => {
    dispatch(fetchTasks(requestFilters));
  }, [dispatch, requestFilters]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.overdue) params.set('overdue', 'true');
    if (filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params, { replace: true });
    localStorage.setItem(TASK_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters, setSearchParams]);

  const handleFilterChange = <K extends keyof TaskListFilters>(
    key: K,
    value: TaskListFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? (value as number) : 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      overdue: false,
      page: 1,
    });
    localStorage.removeItem(TASK_FILTERS_STORAGE_KEY);
  };

  const applyPreset = (preset: 'overdue' | 'in_progress' | 'high_priority') => {
    if (preset === 'overdue') {
      setFilters({ search: '', status: '', priority: '', overdue: true, page: 1 });
      return;
    }

    if (preset === 'in_progress') {
      setFilters({
        search: '',
        status: TaskStatus.IN_PROGRESS,
        priority: '',
        overdue: false,
        page: 1,
      });
      return;
    }

    setFilters({
      search: '',
      status: '',
      priority: TaskPriority.HIGH,
      overdue: false,
      page: 1,
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm(confirmPresets.delete('Task'));
    if (!confirmed) return;
    await dispatch(deleteTask(id));
    dispatch(fetchTasks(buildRequestFilters(filters)));
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
      [TaskStatus.IN_PROGRESS]: 'bg-[var(--loop-blue)] text-black',
      [TaskStatus.WAITING]: 'bg-[var(--loop-yellow)] text-black',
      [TaskStatus.COMPLETED]: 'bg-[var(--loop-green)] text-black',
      [TaskStatus.DEFERRED]: 'bg-[var(--loop-cyan)] text-black',
      [TaskStatus.CANCELLED]: 'bg-[var(--loop-pink)] text-black',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[status]}`}
      >
        {status === TaskStatus.COMPLETED ? (
          <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
        ) : null}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const priorityColors: Record<TaskPriority, string> = {
      [TaskPriority.LOW]: 'bg-app-surface-muted text-app-text-muted',
      [TaskPriority.NORMAL]: 'bg-[var(--loop-cyan)] text-black',
      [TaskPriority.HIGH]: 'bg-[var(--loop-yellow)] text-black',
      [TaskPriority.URGENT]: 'bg-[var(--loop-pink)] text-black',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${priorityColors[priority]}`}
      >
        {priority === TaskPriority.HIGH || priority === TaskPriority.URGENT ? (
          <FlagIcon className="h-3.5 w-3.5" aria-hidden="true" />
        ) : null}
        {priority}
      </span>
    );
  };

  if (error) {
    return (
      <NeoBrutalistLayout pageTitle="TASKS">
        <div className="container mx-auto px-4 py-8">
          <div className="p-4 bg-app-accent-soft border-2 border-app-border text-app-accent-text shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            Error: {error}
          </div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="TASKS">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-black text-[var(--app-text)]">Tasks</h1>
          <Link to="/tasks/new" className={`w-full sm:w-auto ${taskActionLinkClass}`}>
            <PlusCircleIcon className="h-5 w-5" aria-hidden="true" />+ New Task
          </Link>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`bg-app-accent-soft ${taskSummaryCardClass}`}>
              <div className="inline-flex items-center gap-2 text-sm font-bold uppercase text-app-accent">
                <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
                Overdue
              </div>
              <div className="text-2xl font-black text-app-accent-text">{summary.overdue}</div>
            </div>
            <div className={`bg-[var(--loop-yellow)] ${taskSummaryCardClass}`}>
              <div className="inline-flex items-center gap-2 text-sm font-bold uppercase text-black">
                <ClockIcon className="h-5 w-5" aria-hidden="true" />
                Due Today
              </div>
              <div className="text-2xl font-black text-black">{summary.due_today}</div>
            </div>
            <div className={`bg-[var(--loop-blue)] ${taskSummaryCardClass}`}>
              <div className="inline-flex items-center gap-2 text-sm font-bold uppercase text-black">
                <ClockIcon className="h-5 w-5" aria-hidden="true" />
                Due This Week
              </div>
              <div className="text-2xl font-black text-black">{summary.due_this_week}</div>
            </div>
            <div className={`bg-[var(--loop-green)] ${taskSummaryCardClass}`}>
              <div className="inline-flex items-center gap-2 text-sm font-bold uppercase text-black">
                <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                Total Tasks
              </div>
              <div className="text-2xl font-black text-black">{pagination.total}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[var(--app-surface)] border-2 border-[var(--app-border)] shadow-[4px_4px_0px_0px_var(--shadow-color)] p-4 mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase text-[var(--app-text-muted)]">
              Quick filters:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('overdue')}
              className="px-2 py-1 text-xs font-bold border-2 border-[var(--app-border)] bg-app-accent-soft text-app-accent-text"
            >
              Overdue
            </button>
            <button
              type="button"
              onClick={() => applyPreset('in_progress')}
              className="px-2 py-1 text-xs font-bold border-2 border-[var(--app-border)] bg-app-accent-soft text-app-accent-text"
            >
              In Progress
            </button>
            <button
              type="button"
              onClick={() => applyPreset('high_priority')}
              className="px-2 py-1 text-xs font-bold border-2 border-[var(--app-border)] bg-app-accent-soft text-app-accent-text"
            >
              High Priority
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              {filters.search && (
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="px-2 py-1 text-xs border-2 border-[var(--app-border)]"
                >
                  Search: {filters.search} ×
                </button>
              )}
              {filters.status && (
                <button
                  onClick={() => handleFilterChange('status', '')}
                  className="px-2 py-1 text-xs border-2 border-[var(--app-border)]"
                >
                  Status: {filters.status} ×
                </button>
              )}
              {filters.priority && (
                <button
                  onClick={() => handleFilterChange('priority', '')}
                  className="px-2 py-1 text-xs border-2 border-[var(--app-border)]"
                >
                  Priority: {filters.priority} ×
                </button>
              )}
              {filters.overdue && (
                <button
                  onClick={() => handleFilterChange('overdue', false)}
                  className="px-2 py-1 text-xs border-2 border-[var(--app-border)]"
                >
                  Overdue ×
                </button>
              )}
              <button
                onClick={clearFilters}
                className="px-2 py-1 text-xs font-bold border-2 border-[var(--app-border)] bg-[var(--loop-yellow)]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Task Table */}
        <div className="overflow-hidden border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
          {loading ? (
            <div className="p-8 text-center text-[var(--app-text-muted)]">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-[var(--app-text-muted)]">
              <p>No tasks match your current filters.</p>
              <div className="mt-4 flex justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 border-2 border-[var(--app-border)] text-[var(--app-text)] font-bold"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/tasks/new"
                  className="px-3 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-green)] text-black font-bold"
                >
                  New Task
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {tasks.map((task) => {
                  const overdue = isOverdue(task.due_date, task.status);

                  return (
                    <div
                      key={task.id}
                      data-testid="mobile-task-card"
                      className="rounded-[var(--ui-radius-md)] border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-black text-[var(--app-text)]">
                            {task.subject}
                          </p>
                          {task.related_to_name ? (
                            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                              Related to: {task.related_to_name}
                            </p>
                          ) : null}
                        </div>
                        <details className="shrink-0">
                          <summary className="cursor-pointer border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1 text-xs font-bold uppercase text-[var(--app-text)] shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                            Actions
                          </summary>
                          <div className="mt-2 grid min-w-36 gap-2">
                            <Link to={`/tasks/${task.id}`} className={taskGhostLinkClass}>
                              View
                            </Link>
                            {task.status !== TaskStatus.COMPLETED ? (
                              <button
                                onClick={() => handleComplete(task.id)}
                                className="border-2 border-[var(--app-border)] bg-[var(--loop-green)] px-3 py-2 text-xs font-bold uppercase text-black"
                              >
                                Complete
                              </button>
                            ) : null}
                            <Link to={`/tasks/${task.id}/edit`} className={taskGhostLinkClass}>
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="border-2 border-[var(--app-border)] bg-app-accent-soft px-3 py-2 text-xs font-bold uppercase text-app-accent-text"
                            >
                              Delete
                            </button>
                          </div>
                        </details>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-[var(--app-text)]">
                        <p>Assigned: {task.assigned_to_name || 'Unassigned'}</p>
                        <p className={overdue ? 'font-semibold text-app-accent' : ''}>
                          Due: {formatDueDate(task.due_date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
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
                  <tbody className="divide-y divide-[var(--app-border)] bg-[var(--app-surface)]">
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="transition-colors hover:bg-[var(--app-surface-muted)]"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-[var(--app-text)]">
                            {task.subject}
                          </div>
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
                                ? 'text-app-accent font-semibold'
                                : 'text-[var(--app-text)]'
                            }`}
                          >
                            {formatDueDate(task.due_date)}
                          </div>
                        </td>
                        <td className="space-x-2 px-6 py-4 text-sm font-bold">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="text-[var(--app-accent-text)] hover:text-[var(--app-accent-text-hover)]"
                          >
                            View
                          </Link>
                          {task.status !== TaskStatus.COMPLETED && (
                            <button
                              onClick={() => handleComplete(task.id)}
                              className="text-app-accent hover:text-app-accent-text"
                            >
                              Complete
                            </button>
                          )}
                          <Link
                            to={`/tasks/${task.id}/edit`}
                            className="text-[var(--app-accent-text)] hover:text-[var(--app-accent-text-hover)]"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-app-accent hover:text-app-accent-text"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <>
            <div className="mt-4 flex items-center justify-between gap-2 md:hidden">
              <button
                onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="flex-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-bold uppercase text-[var(--app-text)] disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-center text-sm font-bold text-[var(--app-text)]">
                {pagination.page} / {pagination.pages}
              </p>
              <button
                onClick={() =>
                  handleFilterChange('page', Math.min(pagination.pages, pagination.page + 1))
                }
                disabled={pagination.page === pagination.pages}
                className="flex-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-bold uppercase text-[var(--app-text)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="mt-4 hidden justify-center md:flex">
              <nav
                className="inline-flex shadow-[4px_4px_0px_0px_var(--shadow-color)]"
                aria-label="Task list pagination"
              >
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handleFilterChange('page', page)}
                    className={`border-2 border-[var(--app-border)] px-4 py-2 text-sm font-bold ${
                      pagination.page === page
                        ? 'bg-[var(--app-border)] text-[var(--app-bg)]'
                        : 'bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </>
        )}
        <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
};

export default TaskList;
