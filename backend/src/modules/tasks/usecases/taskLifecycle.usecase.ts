import type {
  CreateTaskDTO,
  Task,
  UpdateTaskDTO,
} from '@app-types/task';
import type { TaskLifecyclePort } from '../types/ports';

export class TaskLifecycleUseCase {
  constructor(private readonly repository: TaskLifecyclePort) {}

  create(payload: CreateTaskDTO, userId: string): Promise<Task> {
    return this.repository.createTask(payload, userId);
  }

  update(taskId: string, payload: UpdateTaskDTO, userId: string): Promise<Task | null> {
    return this.repository.updateTask(taskId, payload, userId);
  }

  delete(taskId: string): Promise<boolean> {
    return this.repository.deleteTask(taskId);
  }

  complete(taskId: string, userId: string): Promise<Task | null> {
    return this.repository.completeTask(taskId, userId);
  }
}
