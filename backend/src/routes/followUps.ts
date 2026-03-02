import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { followUpController } from '@controllers/followUpController';

const router = Router();

const followUpStatusSchema = z.enum(['scheduled', 'completed', 'cancelled', 'overdue']);
const followUpFrequencySchema = z.enum(['once', 'daily', 'weekly', 'biweekly', 'monthly']);
const followUpEntityTypeSchema = z.enum(['case', 'task']);
const followUpMethodSchema = z.enum(['phone', 'email', 'in_person', 'video_call', 'other']);

const dateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

const followUpIdParamSchema = z.object({
  id: uuidSchema,
});

const followUpListQuerySchema = z.object({
  entity_type: followUpEntityTypeSchema.optional(),
  entity_id: uuidSchema.optional(),
  status: followUpStatusSchema.optional(),
  assigned_to: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  overdue_only: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const createFollowUpSchema = z.object({
  entity_type: followUpEntityTypeSchema,
  entity_id: uuidSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  scheduled_date: dateSchema,
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  frequency: followUpFrequencySchema.optional(),
  frequency_end_date: dateSchema.optional(),
  method: followUpMethodSchema.optional(),
  assigned_to: uuidSchema.optional(),
  reminder_minutes_before: z.coerce.number().int().min(0).optional(),
});

const updateFollowUpSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  scheduled_date: dateSchema.optional(),
  scheduled_time: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.null()]).optional(),
  frequency: followUpFrequencySchema.optional(),
  frequency_end_date: z.union([dateSchema, z.null()]).optional(),
  method: z.union([followUpMethodSchema, z.null()]).optional(),
  status: followUpStatusSchema.optional(),
  assigned_to: z.union([uuidSchema, z.null()]).optional(),
  reminder_minutes_before: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
});

const completeFollowUpSchema = z.object({
  completed_notes: z.string().trim().optional(),
  schedule_next: z.coerce.boolean().optional(),
  next_scheduled_date: dateSchema.optional(),
});

const rescheduleFollowUpSchema = z.object({
  scheduled_date: dateSchema,
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const upcomingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

router.use(authenticate);
router.use(requireActiveOrganizationContext);

router.get('/', validateQuery(followUpListQuerySchema), followUpController.getFollowUps);
router.get('/summary', validateQuery(followUpListQuerySchema), followUpController.getFollowUpSummary);
router.get('/upcoming', validateQuery(upcomingQuerySchema), followUpController.getUpcomingFollowUps);
router.get('/:id', validateParams(followUpIdParamSchema), followUpController.getFollowUpById);
router.post('/', validateBody(createFollowUpSchema), followUpController.createFollowUp);
router.put('/:id', validateParams(followUpIdParamSchema), validateBody(updateFollowUpSchema), followUpController.updateFollowUp);
router.post('/:id/complete', validateParams(followUpIdParamSchema), validateBody(completeFollowUpSchema), followUpController.completeFollowUp);
router.post('/:id/cancel', validateParams(followUpIdParamSchema), followUpController.cancelFollowUp);
router.post('/:id/reschedule', validateParams(followUpIdParamSchema), validateBody(rescheduleFollowUpSchema), followUpController.rescheduleFollowUp);
router.delete('/:id', validateParams(followUpIdParamSchema), followUpController.deleteFollowUp);

export default router;
