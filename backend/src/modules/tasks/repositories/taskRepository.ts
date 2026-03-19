import type {
  CreateTaskDTO,
  Task,
  TaskFilters,
  TaskSummary,
  UpdateTaskDTO,
} from '@app-types/task';
import { taskService } from '@services/taskService';
import type { TaskCatalogPort, TaskLifecyclePort } from '../types/ports';

export class TaskRepository implements TaskCatalogPort, TaskLifecyclePort {
  getTasks(filters: TaskFilters): Promise<{
    tasks: Task[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    summary: TaskSummary;
  }> {
    return taskService.getTasks(filters);
  }

  getTaskSummary(filters: TaskFilters): Promise<TaskSummary> {
    return taskService.getTaskSummary(filters);
  }

  getTaskById(taskId: string): Promise<Task | null> {
    return taskService.getTaskById(taskId);
  }

  createTask(payload: CreateTaskDTO, userId: string): Promise<Task> {
    return taskService.createTask(payload, userId);
  }

  updateTask(taskId: string, payload: UpdateTaskDTO, userId: string): Promise<Task | null> {
    return taskService.updateTask(taskId, payload, userId);
  }

  deleteTask(taskId: string): Promise<boolean> {
    return taskService.deleteTask(taskId);
  }

  completeTask(taskId: string, userId: string): Promise<Task | null> {
    return taskService.completeTask(taskId, userId);
  }
}
