import api from '../../../services/api';
import type {
  CreateTaskDTO,
  Task,
  TaskFilters,
  TaskSummary,
  TasksCatalogPort,
  TasksListPayload,
  TasksMutationPort,
  UpdateTaskDTO,
} from '../types/contracts';

const buildTaskSearchParams = (filters: TaskFilters = {}): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return params;
};

export class TasksApiClient implements TasksCatalogPort, TasksMutationPort {
  async listTasks(filters: TaskFilters = {}): Promise<TasksListPayload> {
    const params = buildTaskSearchParams(filters);
    const response = await api.get<TasksListPayload>(`/tasks?${params.toString()}`);
    return response.data;
  }

  async getTaskById(taskId: string): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(payload: CreateTaskDTO): Promise<Task> {
    const response = await api.post<Task>('/tasks', payload);
    return response.data;
  }

  async updateTask(taskId: string, updates: UpdateTaskDTO): Promise<Task> {
    const response = await api.put<Task>(`/tasks/${taskId}`, updates);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  }

  async completeTask(taskId: string): Promise<Task> {
    const response = await api.post<Task>(`/tasks/${taskId}/complete`);
    return response.data;
  }

  async getTaskSummary(filters: TaskFilters = {}): Promise<TaskSummary> {
    const params = buildTaskSearchParams(filters);
    const response = await api.get<TaskSummary>(`/tasks/summary?${params.toString()}`);
    return response.data;
  }
}

export const tasksApiClient = new TasksApiClient();
