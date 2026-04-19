import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { isoDateSchema, optionalStrictBooleanSchema, uuidSchema } from '@validations/shared';
import { Permission } from '@utils/permissions';
import { createFollowUpsController } from '../controllers/followUps.controller';

const followUpStatusSchema = z.enum(['scheduled', 'completed', 'cancelled', 'overdue']);
const followUpFrequencySchema = z.enum(['once', 'daily', 'weekly', 'biweekly', 'monthly']);
const followUpEntityTypeSchema = z.enum(['case', 'task', 'contact']);
const followUpMethodSchema = z.enum(['phone', 'email', 'in_person', 'video_call', 'other']);

const dateSchema = isoDateSchema;

const followUpIdParamSchema = z.object({
  id: uuidSchema,
});

const followUpListQuerySchema = z
  .object({
    entity_type: followUpEntityTypeSchema.optional(),
    entity_id: uuidSchema.optional(),
    status: followUpStatusSchema.optional(),
    assigned_to: uuidSchema.optional(),
    date_from: dateSchema.optional(),
    date_to: dateSchema.optional(),
    overdue_only: optionalStrictBooleanSchema,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const createFollowUpSchema = z.object({
  entity_type: followUpEntityTypeSchema,
  entity_id: uuidSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  scheduled_date: dateSchema,
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
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
  completed_notes: z.string().trim().min(1),
  schedule_next: optionalStrictBooleanSchema,
  next_scheduled_date: dateSchema.optional(),
  outcome_definition_ids: z.array(uuidSchema).optional(),
  outcome_visibility: optionalStrictBooleanSchema,
});

const cancelFollowUpSchema = z.object({
  completed_notes: z.string().trim().min(1),
  outcome_definition_ids: z.array(uuidSchema).optional(),
  outcome_visibility: optionalStrictBooleanSchema,
});

const rescheduleFollowUpSchema = z.object({
  scheduled_date: dateSchema,
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

const upcomingQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const createFollowUpsRoutes = (): Router => {
  const router = Router();
  const controller = createFollowUpsController();

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);

  router.get('/', validateQuery(followUpListQuerySchema), controller.getFollowUps);
  router.get('/summary', validateQuery(followUpListQuerySchema), controller.getFollowUpSummary);
  router.get('/upcoming', validateQuery(upcomingQuerySchema), controller.getUpcomingFollowUps);
  router.get('/:id', validateParams(followUpIdParamSchema), controller.getFollowUpById);
  router.post(
    '/',
    requirePermission(Permission.FOLLOWUP_CREATE),
    validateBody(createFollowUpSchema),
    controller.createFollowUp
  );
  router.put(
    '/:id',
    validateParams(followUpIdParamSchema),
    requirePermission(Permission.FOLLOWUP_EDIT),
    validateBody(updateFollowUpSchema),
    controller.updateFollowUp
  );
  router.post(
    '/:id/complete',
    validateParams(followUpIdParamSchema),
    requirePermission(Permission.FOLLOWUP_EDIT),
    validateBody(completeFollowUpSchema),
    controller.completeFollowUp
  );
  router.post(
    '/:id/cancel',
    validateParams(followUpIdParamSchema),
    requirePermission(Permission.FOLLOWUP_EDIT),
    validateBody(cancelFollowUpSchema),
    controller.cancelFollowUp
  );
  router.post(
    '/:id/reschedule',
    validateParams(followUpIdParamSchema),
    requirePermission(Permission.FOLLOWUP_EDIT),
    validateBody(rescheduleFollowUpSchema),
    controller.rescheduleFollowUp
  );
  router.delete(
    '/:id',
    validateParams(followUpIdParamSchema),
    requirePermission(Permission.FOLLOWUP_DELETE),
    controller.deleteFollowUp
  );

  return router;
};

export const followUpsV2Routes = createFollowUpsRoutes();
