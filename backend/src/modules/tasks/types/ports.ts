import type {
  CreateTaskDTO,
  Task,
  TaskFilters,
  TaskSummary,
  UpdateTaskDTO,
} from '@app-types/task';

export interface TaskCatalogPort {
  getTasks(filters: TaskFilters): Promise<{
    tasks: Task[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    summary: TaskSummary;
  }>;
  getTaskSummary(filters: TaskFilters): Promise<TaskSummary>;
  getTaskById(taskId: string): Promise<Task | null>;
}

export interface TaskLifecyclePort {
  createTask(payload: CreateTaskDTO, userId: string): Promise<Task>;
  updateTask(taskId: string, payload: UpdateTaskDTO, userId: string): Promise<Task | null>;
  deleteTask(taskId: string): Promise<boolean>;
  completeTask(taskId: string, userId: string): Promise<Task | null>;
}
