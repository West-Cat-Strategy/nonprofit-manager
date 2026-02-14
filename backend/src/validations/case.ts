/**
 * Case Validation Schemas
 * Schemas for case management, tracking, and filtering
 */

import { z } from 'zod';
import { uuidSchema, nameSchema, dateRangeSchema } from './shared';

// Case status enum
export const caseStatusSchema = z.enum(['open', 'pending', 'in_progress', 'closed', 'archived']);

export type CaseStatus = z.infer<typeof caseStatusSchema>;

// Case priority enum
export const casePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type CasePriority = z.infer<typeof casePrioritySchema>;

// Create case
export const createCaseSchema = z.object({
  contact_id: uuidSchema,
  case_number: z.string().min(1),
  title: nameSchema,
  description: z.string().min(1).max(5000),
  priority: casePrioritySchema.default('medium'),
  status: caseStatusSchema.default('open'),
  assigned_to: uuidSchema.optional(),
  opened_date: z.coerce.date(),
  due_date: z.coerce.date().optional(),
  closed_date: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => !data.due_date || !data.closed_date || data.due_date >= data.opened_date,
  {
    message: 'Due date must be after opened date',
    path: ['due_date'],
  }
);

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

// Update case
export const updateCaseSchema = z.object({
  title: nameSchema.optional(),
  description: z.string().min(1).max(5000).optional(),
  priority: casePrioritySchema.optional(),
  status: caseStatusSchema.optional(),
  assigned_to: uuidSchema.optional().or(z.null()),
  due_date: z.coerce.date().optional(),
  closed_date: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;

// Case filter
export const caseFilterSchema = z.object({
  search: z.string().optional(),
  status: caseStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  assigned_to: uuidSchema.optional(),
  date_range: dateRangeSchema.optional(),
});

export type CaseFilterInput = z.infer<typeof caseFilterSchema>;
