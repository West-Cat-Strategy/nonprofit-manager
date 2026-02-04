/**
 * Task Service
 * Handles business logic for task management
 */
import { Pool } from 'pg';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, TaskSummary } from '../types/task';
export declare class TaskService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get tasks with optional filtering and pagination
     */
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
    /**
     * Get a single task by ID
     */
    getTaskById(id: string): Promise<Task | null>;
    /**
     * Create a new task
     */
    createTask(taskData: CreateTaskDTO, userId: string): Promise<Task>;
    /**
     * Update a task
     */
    updateTask(id: string, updates: UpdateTaskDTO, userId: string): Promise<Task | null>;
    /**
     * Delete a task
     */
    deleteTask(id: string): Promise<boolean>;
    /**
     * Complete a task
     */
    completeTask(id: string, userId: string): Promise<Task | null>;
    /**
     * Get task summary statistics
     */
    getTaskSummary(filters?: TaskFilters): Promise<TaskSummary>;
}
export declare const taskService: TaskService;
//# sourceMappingURL=taskService.d.ts.map