/**
 * Task Routes
 * API endpoints for task management
 */

import express from 'express';
import { body, query, param } from 'express-validator';
import { taskController } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation rules
const createTaskValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('due_date').optional().isISO8601().withMessage('Invalid date format'),
  body('assigned_to').optional().isUUID().withMessage('Invalid user ID'),
  body('related_to_type')
    .optional()
    .isIn(['account', 'contact', 'event', 'donation', 'volunteer'])
    .withMessage('Invalid related_to_type'),
  body('related_to_id').optional().isUUID().withMessage('Invalid related_to_id'),
];

const updateTaskValidation = [
  body('subject').optional().trim().notEmpty().withMessage('Subject cannot be empty'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  body('completed_date').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  body('assigned_to').optional({ nullable: true }).isUUID().withMessage('Invalid user ID'),
  body('related_to_type')
    .optional({ nullable: true })
    .isIn(['account', 'contact', 'event', 'donation', 'volunteer'])
    .withMessage('Invalid related_to_type'),
  body('related_to_id').optional({ nullable: true }).isUUID().withMessage('Invalid related_to_id'),
];

const taskQueryValidation = [
  query('search').optional().trim(),
  query('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled'])
    .withMessage('Invalid status'),
  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  query('assigned_to').optional().isUUID().withMessage('Invalid user ID'),
  query('related_to_type')
    .optional()
    .isIn(['account', 'contact', 'event', 'donation', 'volunteer'])
    .withMessage('Invalid related_to_type'),
  query('related_to_id').optional().isUUID().withMessage('Invalid related_to_id'),
  query('due_before').optional().isISO8601().withMessage('Invalid date format'),
  query('due_after').optional().isISO8601().withMessage('Invalid date format'),
  query('overdue').optional().isBoolean().withMessage('Invalid boolean value'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const uuidParamValidation = [
  param('id').isUUID().withMessage('Invalid task ID'),
];

// Routes
router.get('/', taskQueryValidation, validateRequest, taskController.getTasks);
router.get('/summary', taskQueryValidation, validateRequest, taskController.getTaskSummary);
router.get('/:id', uuidParamValidation, validateRequest, taskController.getTaskById);
router.post('/', createTaskValidation, validateRequest, taskController.createTask);
router.put('/:id', [...uuidParamValidation, ...updateTaskValidation, validateRequest], taskController.updateTask);
router.delete('/:id', uuidParamValidation, validateRequest, taskController.deleteTask);
router.post('/:id/complete', uuidParamValidation, validateRequest, taskController.completeTask);

export default router;
