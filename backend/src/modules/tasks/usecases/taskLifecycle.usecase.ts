import type {
  CreateTaskDTO,
  Task,
  UpdateTaskDTO,
} from '@app-types/task';
import type { TaskLifecyclePort } from '../types/ports';

export class TaskLifecycleUseCase {
  constructor(private readonly repository: TaskLifecyclePort) {}

  create(payload: CreateTaskDTO, userId: string, organizationId?: string): Promise<Task> {
    return this.repository.createTask(payload, userId, organizationId);
  }

  update(
    taskId: string,
    payload: UpdateTaskDTO,
    userId: string,
    organizationId?: string
  ): Promise<Task | null> {
    return this.repository.updateTask(taskId, payload, userId, organizationId);
  }

  delete(taskId: string, organizationId?: string): Promise<boolean> {
    return this.repository.deleteTask(taskId, organizationId);
  }

  complete(taskId: string, userId: string, organizationId?: string): Promise<Task | null> {
    return this.repository.completeTask(taskId, userId, organizationId);
  }
}
