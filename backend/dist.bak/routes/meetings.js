"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const meetingController_1 = require("../controllers/meetingController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.authorize)('admin', 'manager', 'staff'));
router.get('/committees', meetingController_1.listCommittees);
router.get('/', [
    (0, express_validator_1.query)('committee_id').optional().isUUID(),
    (0, express_validator_1.query)('status').optional().isString(),
    (0, express_validator_1.query)('from').optional().isISO8601(),
    (0, express_validator_1.query)('to').optional().isISO8601(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 200 }),
    validation_1.handleValidationErrors,
], meetingController_1.listMeetings);
router.get('/:id', [(0, express_validator_1.param)('id').isUUID(), validation_1.handleValidationErrors], meetingController_1.getMeetingDetail);
router.post('/', [
    (0, express_validator_1.body)('meeting_type').isIn(['board', 'agm', 'committee']),
    (0, express_validator_1.body)('title').isString().notEmpty(),
    (0, express_validator_1.body)('starts_at').isISO8601(),
    (0, express_validator_1.body)('ends_at').optional().isISO8601(),
    (0, express_validator_1.body)('location').optional().isString(),
    (0, express_validator_1.body)('committee_id').optional().isUUID(),
    (0, express_validator_1.body)('presiding_contact_id').optional().isUUID(),
    (0, express_validator_1.body)('secretary_contact_id').optional().isUUID(),
    validation_1.handleValidationErrors,
], meetingController_1.createMeeting);
router.patch('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('meeting_type').optional().isIn(['board', 'agm', 'committee']),
    (0, express_validator_1.body)('title').optional().isString(),
    (0, express_validator_1.body)('starts_at').optional().isISO8601(),
    (0, express_validator_1.body)('ends_at').optional().isISO8601(),
    (0, express_validator_1.body)('location').optional().isString(),
    (0, express_validator_1.body)('status').optional().isIn(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']),
    (0, express_validator_1.body)('committee_id').optional().isUUID(),
    (0, express_validator_1.body)('presiding_contact_id').optional().isUUID(),
    (0, express_validator_1.body)('secretary_contact_id').optional().isUUID(),
    (0, express_validator_1.body)('minutes_notes').optional().isString(),
    validation_1.handleValidationErrors,
], meetingController_1.updateMeeting);
router.get('/:id/minutes/draft', [(0, express_validator_1.param)('id').isUUID(), validation_1.handleValidationErrors], meetingController_1.getMinutesDraft);
router.post('/:id/agenda-items', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('title').isString().notEmpty(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('item_type').optional().isIn(['discussion', 'motion', 'report', 'other']),
    (0, express_validator_1.body)('duration_minutes').optional().isInt({ min: 1, max: 600 }),
    (0, express_validator_1.body)('presenter_contact_id').optional().isUUID(),
    validation_1.handleValidationErrors,
], meetingController_1.addAgendaItem);
router.post('/:id/agenda/reorder', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('orderedIds').isArray({ min: 0 }),
    (0, express_validator_1.body)('orderedIds.*').isUUID(),
    validation_1.handleValidationErrors,
], meetingController_1.reorderAgenda);
router.post('/:id/motions', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('text').isString().notEmpty(),
    (0, express_validator_1.body)('agenda_item_id').optional().isUUID(),
    (0, express_validator_1.body)('parent_motion_id').optional().isUUID(),
    (0, express_validator_1.body)('moved_by_contact_id').optional().isUUID(),
    (0, express_validator_1.body)('seconded_by_contact_id').optional().isUUID(),
    validation_1.handleValidationErrors,
], meetingController_1.addMotion);
router.patch('/:id/motions/:motionId', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.param)('motionId').isUUID(),
    (0, express_validator_1.body)('status').optional().isIn(['pending', 'passed', 'failed', 'amended', 'withdrawn']),
    (0, express_validator_1.body)('votes_for').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('votes_against').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('votes_abstain').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('result_notes').optional().isString(),
    validation_1.handleValidationErrors,
], meetingController_1.updateMotion);
router.post('/:id/action-items', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('subject').isString().notEmpty(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('motion_id').optional().isUUID(),
    (0, express_validator_1.body)('assigned_contact_id').optional().isUUID(),
    (0, express_validator_1.body)('due_date').optional().isISO8601(),
    validation_1.handleValidationErrors,
], meetingController_1.createActionItem);
exports.default = router;
//# sourceMappingURL=meetings.js.map