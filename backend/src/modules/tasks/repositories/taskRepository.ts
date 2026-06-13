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

  getTaskById(taskId: string, organizationId?: string): Promise<Task | null> {
    return taskService.getTaskByIdForOrganization(taskId, organizationId);
  }

  createTask(payload: CreateTaskDTO, userId: string, organizationId?: string): Promise<Task> {
    return taskService.createTask(payload, userId, organizationId);
  }

  updateTask(
    taskId: string,
    payload: UpdateTaskDTO,
    userId: string,
    organizationId?: string
  ): Promise<Task | null> {
    return taskService.updateTask(taskId, payload, userId, organizationId);
  }

  deleteTask(taskId: string, organizationId?: string): Promise<boolean> {
    return taskService.deleteTask(taskId, organizationId);
  }

  completeTask(taskId: string, userId: string, organizationId?: string): Promise<Task | null> {
    return taskService.completeTask(taskId, userId, organizationId);
  }
}
