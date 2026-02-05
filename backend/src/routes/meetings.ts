import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
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
} from '../controllers/meetingController';

const router = Router();

router.use(authenticate, authorize('admin', 'manager', 'staff'));

router.get('/committees', listCommittees);

router.get(
  '/',
  [
    query('committee_id').optional().isUUID(),
    query('status').optional().isString(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    validateRequest,
  ],
  listMeetings
);

router.get('/:id', [param('id').isUUID(), validateRequest], getMeetingDetail);

router.post(
  '/',
  [
    body('meeting_type').isIn(['board', 'agm', 'committee']),
    body('title').isString().notEmpty(),
    body('starts_at').isISO8601(),
    body('ends_at').optional().isISO8601(),
    body('location').optional().isString(),
    body('committee_id').optional().isUUID(),
    body('presiding_contact_id').optional().isUUID(),
    body('secretary_contact_id').optional().isUUID(),
    validateRequest,
  ],
  createMeeting
);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('meeting_type').optional().isIn(['board', 'agm', 'committee']),
    body('title').optional().isString(),
    body('starts_at').optional().isISO8601(),
    body('ends_at').optional().isISO8601(),
    body('location').optional().isString(),
    body('status').optional().isIn(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']),
    body('committee_id').optional().isUUID(),
    body('presiding_contact_id').optional().isUUID(),
    body('secretary_contact_id').optional().isUUID(),
    body('minutes_notes').optional().isString(),
    validateRequest,
  ],
  updateMeeting
);

router.get('/:id/minutes/draft', [param('id').isUUID(), validateRequest], getMinutesDraft);

router.post(
  '/:id/agenda-items',
  [
    param('id').isUUID(),
    body('title').isString().notEmpty(),
    body('description').optional().isString(),
    body('item_type').optional().isIn(['discussion', 'motion', 'report', 'other']),
    body('duration_minutes').optional().isInt({ min: 1, max: 600 }),
    body('presenter_contact_id').optional().isUUID(),
    validateRequest,
  ],
  addAgendaItem
);

router.post(
  '/:id/agenda/reorder',
  [
    param('id').isUUID(),
    body('orderedIds').isArray({ min: 0 }),
    body('orderedIds.*').isUUID(),
    validateRequest,
  ],
  reorderAgenda
);

router.post(
  '/:id/motions',
  [
    param('id').isUUID(),
    body('text').isString().notEmpty(),
    body('agenda_item_id').optional().isUUID(),
    body('parent_motion_id').optional().isUUID(),
    body('moved_by_contact_id').optional().isUUID(),
    body('seconded_by_contact_id').optional().isUUID(),
    validateRequest,
  ],
  addMotion
);

router.patch(
  '/:id/motions/:motionId',
  [
    param('id').isUUID(),
    param('motionId').isUUID(),
    body('status').optional().isIn(['pending', 'passed', 'failed', 'amended', 'withdrawn']),
    body('votes_for').optional().isInt({ min: 0 }),
    body('votes_against').optional().isInt({ min: 0 }),
    body('votes_abstain').optional().isInt({ min: 0 }),
    body('result_notes').optional().isString(),
    validateRequest,
  ],
  updateMotion
);

router.post(
  '/:id/action-items',
  [
    param('id').isUUID(),
    body('subject').isString().notEmpty(),
    body('description').optional().isString(),
    body('motion_id').optional().isUUID(),
    body('assigned_contact_id').optional().isUUID(),
    body('due_date').optional().isISO8601(),
    validateRequest,
  ],
  createActionItem
);

export default router;

