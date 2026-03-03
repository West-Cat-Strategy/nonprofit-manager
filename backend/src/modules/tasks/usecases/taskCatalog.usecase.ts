import type {
  Task,
  TaskFilters,
  TaskSummary,
} from '@app-types/task';
import type { TaskCatalogPort } from '../types/ports';

export class TaskCatalogUseCase {
  constructor(private readonly repository: TaskCatalogPort) {}

  list(filters: TaskFilters): Promise<{
    tasks: Task[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    summary: TaskSummary;
  }> {
    return this.repository.getTasks(filters);
  }

  summary(filters: TaskFilters): Promise<TaskSummary> {
    return this.repository.getTaskSummary(filters);
  }

  getById(taskId: string): Promise<Task | null> {
    return this.repository.getTaskById(taskId);
  }
}
