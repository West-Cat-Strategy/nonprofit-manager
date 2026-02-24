/**
 * Task Routes
 * API endpoints for task management
 */

import express from 'express';
import { z } from 'zod';
import { taskController } from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = express.Router();

const taskStatusSchema = z.enum(['not_started', 'in_progress', 'waiting', 'completed', 'deferred', 'cancelled']);
const taskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
const relatedToTypeSchema = z.enum(['account', 'contact', 'event', 'donation', 'volunteer']);

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date format');

const taskIdParamsSchema = z.object({
  id: uuidSchema,
});

const createTaskSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  description: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: dateStringSchema.optional(),
  assigned_to: uuidSchema.optional(),
  related_to_type: relatedToTypeSchema.optional(),
  related_to_id: uuidSchema.optional(),
});

const updateTaskSchema = z.object({
  subject: z.string().trim().min(1, 'Subject cannot be empty').optional(),
  description: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_date: z.union([dateStringSchema, z.null()]).optional(),
  completed_date: z.union([dateStringSchema, z.null()]).optional(),
  assigned_to: z.union([uuidSchema, z.null()]).optional(),
  related_to_type: z.union([relatedToTypeSchema, z.null()]).optional(),
  related_to_id: z.union([uuidSchema, z.null()]).optional(),
});

const taskQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigned_to: uuidSchema.optional(),
  related_to_type: relatedToTypeSchema.optional(),
  related_to_id: uuidSchema.optional(),
  due_before: dateStringSchema.optional(),
  due_after: dateStringSchema.optional(),
  overdue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.get('/', validateQuery(taskQuerySchema), taskController.getTasks);
router.get('/summary', validateQuery(taskQuerySchema), taskController.getTaskSummary);
router.get('/:id', validateParams(taskIdParamsSchema), taskController.getTaskById);
router.post('/', validateBody(createTaskSchema), taskController.createTask);
router.put('/:id', validateParams(taskIdParamsSchema), validateBody(updateTaskSchema), taskController.updateTask);
router.delete('/:id', validateParams(taskIdParamsSchema), taskController.deleteTask);
router.post('/:id/complete', validateParams(taskIdParamsSchema), taskController.completeTask);

export default router;
