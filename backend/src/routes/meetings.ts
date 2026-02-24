import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  listCommittees,
  listMeetings,
  getMeetingDetail,
  createMeeting,
  updateMeeting,
  addAgendaItem,
  reorderAgenda,
  addMotion,
  updateMotion,
  createActionItem,
  getMinutesDraft,
} from '@controllers/domains/engagement';
import { uuidSchema } from '@validations/shared';

const router = Router();

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');
const meetingTypeSchema = z.enum(['board', 'agm', 'committee']);
const meetingStatusSchema = z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']);
const motionStatusSchema = z.enum(['pending', 'passed', 'failed', 'amended', 'withdrawn']);

const idParamsSchema = z.object({
  id: uuidSchema,
});

const motionParamsSchema = z.object({
  id: uuidSchema,
  motionId: uuidSchema,
});

const listMeetingsQuerySchema = z.object({
  committee_id: uuidSchema.optional(),
  status: z.string().optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const createMeetingSchema = z.object({
  meeting_type: meetingTypeSchema,
  title: z.string().min(1),
  starts_at: dateStringSchema,
  ends_at: dateStringSchema.optional(),
  location: z.string().optional(),
  committee_id: uuidSchema.optional(),
  presiding_contact_id: uuidSchema.optional(),
  secretary_contact_id: uuidSchema.optional(),
});

const updateMeetingSchema = z.object({
  meeting_type: meetingTypeSchema.optional(),
  title: z.string().optional(),
  starts_at: dateStringSchema.optional(),
  ends_at: dateStringSchema.optional(),
  location: z.string().optional(),
  status: meetingStatusSchema.optional(),
  committee_id: uuidSchema.optional(),
  presiding_contact_id: uuidSchema.optional(),
  secretary_contact_id: uuidSchema.optional(),
  minutes_notes: z.string().optional(),
});

const addAgendaItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  item_type: z.enum(['discussion', 'motion', 'report', 'other']).optional(),
  duration_minutes: z.coerce.number().int().min(1).max(600).optional(),
  presenter_contact_id: uuidSchema.optional(),
});

const reorderAgendaSchema = z.object({
  orderedIds: z.array(uuidSchema),
});

const addMotionSchema = z.object({
  text: z.string().min(1),
  agenda_item_id: uuidSchema.optional(),
  parent_motion_id: uuidSchema.optional(),
  moved_by_contact_id: uuidSchema.optional(),
  seconded_by_contact_id: uuidSchema.optional(),
});

const updateMotionSchema = z.object({
  status: motionStatusSchema.optional(),
  votes_for: z.coerce.number().int().min(0).optional(),
  votes_against: z.coerce.number().int().min(0).optional(),
  votes_abstain: z.coerce.number().int().min(0).optional(),
  result_notes: z.string().optional(),
});

const createActionItemSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  motion_id: uuidSchema.optional(),
  assigned_contact_id: uuidSchema.optional(),
  due_date: dateStringSchema.optional(),
});

router.use(authenticate, authorize('admin', 'manager', 'staff'));

router.get('/committees', listCommittees);

router.get('/', validateQuery(listMeetingsQuerySchema), listMeetings);

router.get('/:id', validateParams(idParamsSchema), getMeetingDetail);

router.post('/', validateBody(createMeetingSchema), createMeeting);

router.patch('/:id', validateParams(idParamsSchema), validateBody(updateMeetingSchema), updateMeeting);

router.get('/:id/minutes/draft', validateParams(idParamsSchema), getMinutesDraft);

router.post('/:id/agenda-items', validateParams(idParamsSchema), validateBody(addAgendaItemSchema), addAgendaItem);

router.post('/:id/agenda/reorder', validateParams(idParamsSchema), validateBody(reorderAgendaSchema), reorderAgenda);

router.post('/:id/motions', validateParams(idParamsSchema), validateBody(addMotionSchema), addMotion);

router.patch('/:id/motions/:motionId', validateParams(motionParamsSchema), validateBody(updateMotionSchema), updateMotion);

router.post('/:id/action-items', validateParams(idParamsSchema), validateBody(createActionItemSchema), createActionItem);

export default router;
