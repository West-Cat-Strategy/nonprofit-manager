/**
 * Task Validation Schemas
 * Schemas for task management, assignments, and tracking
 */

import { z } from 'zod';
import { uuidSchema, nameSchema, dateRangeSchema } from './shared';

// Task status enum
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'in_review', 'completed', 'cancelled']);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

// Task priority enum
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

// Create task
export const createTaskSchema = z.object({
  title: nameSchema,
  description: z.string().max(5000).optional(),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  assigned_to: uuidSchema.optional(),
  due_date: z.coerce.date().optional(),
  start_date: z.coerce.date().optional(),
  completed_date: z.coerce.date().optional(),
  related_contact_id: uuidSchema.optional(),
  related_case_id: uuidSchema.optional(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => !data.start_date || !data.due_date || data.start_date <= data.due_date,
  {
    message: 'Due date must be after start date',
    path: ['due_date'],
  }
);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// Update task
export const updateTaskSchema = z.object({
  title: nameSchema.optional(),
  description: z.string().max(5000).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigned_to: uuidSchema.optional().or(z.null()),
  due_date: z.coerce.date().optional(),
  start_date: z.coerce.date().optional(),
  completed_date: z.coerce.date().optional(),
  related_contact_id: uuidSchema.optional().or(z.null()),
  related_case_id: uuidSchema.optional().or(z.null()),
  tags: z.array(z.string()).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Task filter
export const taskFilterSchema = z.object({
  search: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigned_to: uuidSchema.optional(),
  date_range: dateRangeSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
