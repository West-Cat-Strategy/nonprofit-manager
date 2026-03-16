import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import { tasksApiClient } from '../../tasks/api/tasksApiClient';
import type { Task, TaskPriority } from '../../../types/task';
import { formatDateTime } from '../../../utils/format';

interface ContactTasksPanelProps {
  contactId: string;
}

const priorityTone: Record<TaskPriority, string> = {
  low: 'bg-app-surface-muted text-app-text-muted',
  normal: 'bg-app-surface-muted text-app-text',
  high: 'bg-app-accent-soft text-app-accent-text',
  urgent: 'bg-app-accent-soft text-app-accent-text',
};

const statusLabel: Record<Task['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  waiting: 'Waiting',
  completed: 'Completed',
  deferred: 'Deferred',
  cancelled: 'Cancelled',
};

const priorityLabel: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const normalizeDateTimeLocal = (value: string): string | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
};

export default function ContactTasksPanel({ contactId }: ContactTasksPanelProps) {
  const { showError, showSuccess } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = await tasksApiClient.listTasks({
        related_to_type: 'contact',
        related_to_id: contactId,
        limit: 25,
      });
      setTasks(payload.tasks || []);
    } catch (loadError) {
      console.error('Failed to load contact tasks', loadError);
      setError('Failed to load tasks for this contact.');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setDueDate('');
    setPriority('normal');
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!subject.trim()) {
      showError('Task subject is required');
      return;
    }

    const normalizedDueDate = normalizeDateTimeLocal(dueDate);
    if (dueDate && !normalizedDueDate) {
      showError('Enter a valid due date and time');
      return;
    }

    try {
      setIsCreating(true);
      await tasksApiClient.createTask({
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: normalizedDueDate,
        related_to_type: 'contact',
        related_to_id: contactId,
      });
      showSuccess('Task created');
      resetForm();
      setShowForm(false);
      await loadTasks();
    } catch (createError) {
      console.error('Failed to create contact task', createError);
      showError('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading tasks">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-lg border border-app-border bg-app-surface-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-black/70">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} linked to this person
          </p>
          <p className="text-sm text-black/60">
            Create a follow-up task here and jump straight into the full task detail when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="px-4 py-2 text-sm font-black uppercase border-2 border-black bg-[var(--loop-green)] shadow-[2px_2px_0px_var(--shadow-color)]"
        >
          {showForm ? 'Close Task Form' : 'New Task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateTask} className="space-y-4 border-2 border-black bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="contact-task-subject" className="block text-xs font-black uppercase text-black/70">
                Subject
              </label>
              <input
                id="contact-task-subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Follow up on housing intake"
                className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="contact-task-description"
                className="block text-xs font-black uppercase text-black/70"
              >
                Details
              </label>
              <textarea
                id="contact-task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Optional context for the assignee"
                className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label htmlFor="contact-task-due-date" className="block text-xs font-black uppercase text-black/70">
                Due Date
              </label>
              <input
                id="contact-task-due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label htmlFor="contact-task-priority" className="block text-xs font-black uppercase text-black/70">
                Priority
              </label>
              <select
                id="contact-task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="mt-1 w-full border-2 border-black px-3 py-2 text-sm font-bold"
              >
                {Object.entries(priorityLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-sm font-black uppercase border-2 border-black bg-[var(--loop-yellow)] shadow-[2px_2px_0px_var(--shadow-color)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 text-sm font-black uppercase border-2 border-black bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="flex flex-col gap-3 border-2 border-black bg-app-accent-soft p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-bold text-app-accent-text">{error}</p>
          <button
            type="button"
            onClick={() => void loadTasks()}
            className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white"
          >
            Retry
          </button>
        </div>
      )}

      {!error && tasks.length === 0 && (
        <div className="border-2 border-dashed border-black/30 bg-white px-6 py-10 text-center">
          <p className="text-sm font-black uppercase text-black/60">No tasks yet</p>
          <p className="mt-2 text-sm font-bold text-black/70">
            Create a task to track the next thing your team needs to do for this person.
          </p>
        </div>
      )}

      {!error && tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-3 border-2 border-black bg-white p-4 shadow-[2px_2px_0px_var(--shadow-color)] md:flex-row md:items-start md:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black uppercase text-black">
                    {statusLabel[task.status]}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-black uppercase ${priorityTone[task.priority]}`}>
                    {priorityLabel[task.priority]}
                  </span>
                </div>
                <div>
                  <p className="text-base font-black text-black">{task.subject}</p>
                  {task.description && (
                    <p className="mt-1 text-sm font-bold text-black/70">{task.description}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-black/60">
                  {task.due_date ? `Due ${formatDateTime(task.due_date)}` : 'No due date set'}
                </p>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/tasks/${task.id}`}
                  className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white hover:bg-[var(--loop-yellow)]"
                >
                  Open Task
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
