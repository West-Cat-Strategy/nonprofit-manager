"use strict";
/**
 * Task Controller
 * Handles HTTP requests for task management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskController = void 0;
const taskService_1 = require("../services/taskService");
const logger_1 = require("../config/logger");
const queryHelpers_1 = require("../utils/queryHelpers");
exports.taskController = {
    /**
     * GET /api/tasks
     * Get all tasks with optional filters
     */
    async getTasks(req, res) {
        try {
            const filters = {
                search: (0, queryHelpers_1.getString)(req.query.search),
                status: (0, queryHelpers_1.getString)(req.query.status),
                priority: (0, queryHelpers_1.getString)(req.query.priority),
                assigned_to: (0, queryHelpers_1.getString)(req.query.assigned_to),
                related_to_type: (0, queryHelpers_1.getString)(req.query.related_to_type),
                related_to_id: (0, queryHelpers_1.getString)(req.query.related_to_id),
                due_before: (0, queryHelpers_1.getString)(req.query.due_before),
                due_after: (0, queryHelpers_1.getString)(req.query.due_after),
                overdue: (0, queryHelpers_1.getBoolean)(req.query.overdue),
                page: (0, queryHelpers_1.getInteger)(req.query.page),
                limit: (0, queryHelpers_1.getInteger)(req.query.limit),
            };
            const result = await taskService_1.taskService.getTasks(filters);
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Error in getTasks', { error });
            res.status(500).json({ message: 'Failed to retrieve tasks' });
        }
    },
    /**
     * GET /api/tasks/summary
     * Get task summary statistics
     */
    async getTaskSummary(req, res) {
        try {
            const filters = {
                assigned_to: (0, queryHelpers_1.getString)(req.query.assigned_to),
                related_to_type: (0, queryHelpers_1.getString)(req.query.related_to_type),
                related_to_id: (0, queryHelpers_1.getString)(req.query.related_to_id),
            };
            const summary = await taskService_1.taskService.getTaskSummary(filters);
            res.json(summary);
        }
        catch (error) {
            logger_1.logger.error('Error in getTaskSummary', { error });
            res.status(500).json({ message: 'Failed to retrieve task summary' });
        }
    },
    /**
     * GET /api/tasks/:id
     * Get a single task by ID
     */
    async getTaskById(req, res) {
        try {
            const { id } = req.params;
            const task = await taskService_1.taskService.getTaskById(id);
            if (!task) {
                res.status(404).json({ message: 'Task not found' });
                return;
            }
            res.json(task);
        }
        catch (error) {
            logger_1.logger.error('Error in getTaskById', { error });
            res.status(500).json({ message: 'Failed to retrieve task' });
        }
    },
    /**
     * POST /api/tasks
     * Create a new task
     */
    async createTask(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }
            const task = await taskService_1.taskService.createTask(req.body, userId);
            res.status(201).json(task);
        }
        catch (error) {
            logger_1.logger.error('Error in createTask', { error });
            res.status(500).json({ message: 'Failed to create task' });
        }
    },
    /**
     * PUT /api/tasks/:id
     * Update a task
     */
    async updateTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }
            const task = await taskService_1.taskService.updateTask(id, req.body, userId);
            if (!task) {
                res.status(404).json({ message: 'Task not found' });
                return;
            }
            res.json(task);
        }
        catch (error) {
            logger_1.logger.error('Error in updateTask', { error });
            res.status(500).json({ message: 'Failed to update task' });
        }
    },
    /**
     * DELETE /api/tasks/:id
     * Delete a task
     */
    async deleteTask(req, res) {
        try {
            const { id } = req.params;
            const success = await taskService_1.taskService.deleteTask(id);
            if (!success) {
                res.status(404).json({ message: 'Task not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            logger_1.logger.error('Error in deleteTask', { error });
            res.status(500).json({ message: 'Failed to delete task' });
        }
    },
    /**
     * POST /api/tasks/:id/complete
     * Mark a task as complete
     */
    async completeTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }
            const task = await taskService_1.taskService.completeTask(id, userId);
            if (!task) {
                res.status(404).json({ message: 'Task not found' });
                return;
            }
            res.json(task);
        }
        catch (error) {
            logger_1.logger.error('Error in completeTask', { error });
            res.status(500).json({ message: 'Failed to complete task' });
        }
    },
};
//# sourceMappingURL=taskController.js.map