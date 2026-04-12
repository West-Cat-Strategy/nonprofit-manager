import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/format';

interface TaskItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface ContactTasksProps {
  contactId: string;
}

export default function ContactTasks({ contactId }: ContactTasksProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/tasks', {
        params: {
          related_to_type: 'contact',
          related_to_id: contactId,
          limit: 5,
        },
      });
      setTasks(response.data.tasks || []);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    try {
      await api.post('/tasks', {
        subject: subject.trim(),
        priority,
        due_date: dueDate || undefined,
        related_to_type: 'contact',
        related_to_id: contactId,
      });
      setSubject('');
      setDueDate('');
      setPriority('normal');
      setShowForm(false);
      loadTasks();
    } catch {
      setError('Failed to create task');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
<<<<<<< HEAD
        <h3 className="text-lg font-black uppercase text-[var(--app-text-heading)]">Tasks</h3>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="px-3 py-2 text-xs font-black uppercase border-2 border-[var(--app-border)] bg-[var(--loop-green)] text-[var(--app-text-heading)]"
=======
        <h3 className="text-lg font-black uppercase text-black">Tasks</h3>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-[var(--loop-green)]"
>>>>>>> origin/main
        >
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
<<<<<<< HEAD
        <form onSubmit={handleCreate} className="border-2 border-[var(--app-border)] p-4 bg-app-surface space-y-3">
=======
        <form onSubmit={handleCreate} className="border-2 border-black p-4 bg-white space-y-3">
>>>>>>> origin/main
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Task subject"
<<<<<<< HEAD
            className="w-full border-2 border-[var(--app-border)] px-3 py-2 text-sm font-bold bg-[var(--app-input-bg)] text-[var(--app-text)]"
=======
            className="w-full border-2 border-black px-3 py-2 text-sm font-bold"
>>>>>>> origin/main
            aria-label="Task subject"
            required
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
<<<<<<< HEAD
              className="border-2 border-[var(--app-border)] px-3 py-2 text-sm font-bold bg-[var(--app-input-bg)] text-[var(--app-text)]"
=======
              className="border-2 border-black px-3 py-2 text-sm font-bold"
>>>>>>> origin/main
              aria-label="Task due date"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
<<<<<<< HEAD
              className="border-2 border-[var(--app-border)] px-3 py-2 text-sm font-bold bg-[var(--app-input-bg)] text-[var(--app-text)]"
=======
              className="border-2 border-black px-3 py-2 text-sm font-bold"
>>>>>>> origin/main
              aria-label="Task priority"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="submit"
<<<<<<< HEAD
              className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] text-sm font-black uppercase text-[var(--app-text-heading)]"
=======
              className="px-4 py-2 border-2 border-black bg-[var(--loop-yellow)] text-sm font-black uppercase"
>>>>>>> origin/main
            >
              Create
            </button>
          </div>
        </form>
      )}

<<<<<<< HEAD
      {loading && <div className="text-sm font-bold text-app-text-muted">Loading tasks...</div>}
      {error && <div className="text-sm font-bold text-app-accent">{error}</div>}

      {!loading && tasks.length === 0 && (
        <div className="text-sm font-bold text-app-text-muted">No tasks linked to this person</div>
      )}

      {tasks.map((task) => (
        <div key={task.id} className="border-2 border-[var(--app-border)] p-3 bg-app-surface">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-black text-[var(--app-text-heading)] text-sm">{task.subject}</div>
              <div className="text-xs font-bold text-app-text-muted">
                {task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date'}
              </div>
            </div>
            <div className="text-xs font-black uppercase text-app-text-muted">{task.priority}</div>
=======
      {loading && <div className="text-sm font-bold text-black/60">Loading tasks...</div>}
      {error && <div className="text-sm font-bold text-app-accent">{error}</div>}

      {!loading && tasks.length === 0 && (
        <div className="text-sm font-bold text-black/60">No tasks linked to this person</div>
      )}

      {tasks.map((task) => (
        <div key={task.id} className="border-2 border-black p-3 bg-white">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-black text-black text-sm">{task.subject}</div>
              <div className="text-xs font-bold text-black/60">
                {task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date'}
              </div>
            </div>
            <div className="text-xs font-black uppercase text-black/70">{task.priority}</div>
>>>>>>> origin/main
          </div>
        </div>
      ))}
    </div>
  );
}
