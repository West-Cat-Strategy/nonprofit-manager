/**
 * Task Controller
 * Handles HTTP requests for task management
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { taskService } from '../services/taskService';
import { TaskFilters } from '../types/task';
import { logger } from '../config/logger';
import { getString, getBoolean, getInteger } from '../utils/queryHelpers';
import { notFoundMessage, serverError, unauthorized } from '../utils/responseHelpers';

export const taskController = {
  /**
   * GET /api/tasks
   * Get all tasks with optional filters
   */
  async getTasks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters: TaskFilters = {
        search: getString(req.query.search),
        status: getString(req.query.status) as any,
        priority: getString(req.query.priority) as any,
        assigned_to: getString(req.query.assigned_to),
        related_to_type: getString(req.query.related_to_type) as any,
        related_to_id: getString(req.query.related_to_id),
        due_before: getString(req.query.due_before),
        due_after: getString(req.query.due_after),
        overdue: getBoolean(req.query.overdue),
        page: getInteger(req.query.page),
        limit: getInteger(req.query.limit),
      };

      const result = await taskService.getTasks(filters);
      res.json(result);
    } catch (error) {
      logger.error('Error in getTasks', { error });
      serverError(res, 'Failed to retrieve tasks');
    }
  },

  /**
   * GET /api/tasks/summary
   * Get task summary statistics
   */
  async getTaskSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filters: TaskFilters = {
        assigned_to: getString(req.query.assigned_to),
        related_to_type: getString(req.query.related_to_type) as any,
        related_to_id: getString(req.query.related_to_id),
      };

      const summary = await taskService.getTaskSummary(filters);
      res.json(summary);
    } catch (error) {
      logger.error('Error in getTaskSummary', { error });
      serverError(res, 'Failed to retrieve task summary');
    }
  },

  /**
   * GET /api/tasks/:id
   * Get a single task by ID
   */
  async getTaskById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);

      if (!task) {
        notFoundMessage(res, 'Task not found');
        return;
      }

      res.json(task);
    } catch (error) {
      logger.error('Error in getTaskById', { error });
      serverError(res, 'Failed to retrieve task');
    }
  },

  /**
   * POST /api/tasks
   * Create a new task
   */
  async createTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        unauthorized(res, 'User not authenticated');
        return;
      }

      const task = await taskService.createTask(req.body, userId);
      res.status(201).json(task);
    } catch (error) {
      logger.error('Error in createTask', { error });
      serverError(res, 'Failed to create task');
    }
  },

  /**
   * PUT /api/tasks/:id
   * Update a task
   */
  async updateTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        unauthorized(res, 'User not authenticated');
        return;
      }

      const task = await taskService.updateTask(id, req.body, userId);

      if (!task) {
        notFoundMessage(res, 'Task not found');
        return;
      }

      res.json(task);
    } catch (error) {
      logger.error('Error in updateTask', { error });
      serverError(res, 'Failed to update task');
    }
  },

  /**
   * DELETE /api/tasks/:id
   * Delete a task
   */
  async deleteTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await taskService.deleteTask(id);

      if (!success) {
        notFoundMessage(res, 'Task not found');
        return;
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Error in deleteTask', { error });
      serverError(res, 'Failed to delete task');
    }
  },

  /**
   * POST /api/tasks/:id/complete
   * Mark a task as complete
   */
  async completeTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        unauthorized(res, 'User not authenticated');
        return;
      }

      const task = await taskService.completeTask(id, userId);

      if (!task) {
        notFoundMessage(res, 'Task not found');
        return;
      }

      res.json(task);
    } catch (error) {
      logger.error('Error in completeTask', { error });
      serverError(res, 'Failed to complete task');
    }
  },
};