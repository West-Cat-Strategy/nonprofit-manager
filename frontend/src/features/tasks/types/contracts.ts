import type { CreateTaskDTO, Task, TaskFilters, TaskSummary, UpdateTaskDTO } from '../../../types/task';

export type { CreateTaskDTO, Task, TaskFilters, TaskSummary, UpdateTaskDTO };

export interface TasksListPayload {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: TaskSummary;
}

export interface TasksCatalogPort {
  listTasks(filters?: TaskFilters): Promise<TasksListPayload>;
  getTaskById(taskId: string): Promise<Task>;
  getTaskSummary(filters?: TaskFilters): Promise<TaskSummary>;
}

export interface TasksMutationPort {
  createTask(payload: CreateTaskDTO): Promise<Task>;
  updateTask(taskId: string, updates: UpdateTaskDTO): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  completeTask(taskId: string): Promise<Task>;
}
