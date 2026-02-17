import type { Task } from '../../types/schema';
import api from '../api';

interface TaskApiResponse {
  id: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  completed_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  related_to_type?: string;
  related_to_id?: string;
  related_to_name?: string;
}

interface TasksListResponse {
  tasks: TaskApiResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  summary?: {
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    overdue: number;
    due_today: number;
    due_this_week: number;
  };
}

const STATUS_MAP: Record<string, Task['status']> = {
  not_started: 'todo',
  in_progress: 'in-progress',
  waiting: 'todo',
  completed: 'done',
  deferred: 'todo',
  cancelled: 'done',
};

const CATEGORY_MAP: Record<string, Task['category']> = {
  contact: 'admin',
  account: 'admin',
  donation: 'finance',
  event: 'admin',
  volunteer: 'hr',
};

function adaptTask(task: TaskApiResponse): Task {
  return {
    id: task.id,
    title: task.subject,
    category: (task.related_to_type
      ? CATEGORY_MAP[task.related_to_type] || 'admin'
      : 'admin') as Task['category'],
    status: STATUS_MAP[task.status] || 'todo',
    dueDate: task.due_date || undefined,
    assignees: task.assigned_to_name ? [task.assigned_to_name] : [],
  };
}

export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get<TasksListResponse>('/tasks', {
    params: { limit: '100' },
  });
  const tasks = response.data.tasks || [];
  return tasks.map(adaptTask);
};
