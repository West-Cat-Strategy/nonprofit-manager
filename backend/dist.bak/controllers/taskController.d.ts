/**
 * Task Controller
 * Handles HTTP requests for task management
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const taskController: {
    /**
     * GET /api/tasks
     * Get all tasks with optional filters
     */
    getTasks(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/tasks/summary
     * Get task summary statistics
     */
    getTaskSummary(req: AuthRequest, res: Response): Promise<void>;
    /**
     * GET /api/tasks/:id
     * Get a single task by ID
     */
    getTaskById(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/tasks
     * Create a new task
     */
    createTask(req: AuthRequest, res: Response): Promise<void>;
    /**
     * PUT /api/tasks/:id
     * Update a task
     */
    updateTask(req: AuthRequest, res: Response): Promise<void>;
    /**
     * DELETE /api/tasks/:id
     * Delete a task
     */
    deleteTask(req: AuthRequest, res: Response): Promise<void>;
    /**
     * POST /api/tasks/:id/complete
     * Mark a task as complete
     */
    completeTask(req: AuthRequest, res: Response): Promise<void>;
};
//# sourceMappingURL=taskController.d.ts.map