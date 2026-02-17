"use strict";
/**
 * Event Routes
 * API routes for event scheduling and registration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const dataScope_1 = require("../middleware/dataScope");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use((0, dataScope_1.loadDataScope)('events'));
/**
 * GET /api/events
 * Get all events with optional filtering
 */
router.get('/', [
    (0, express_validator_1.query)('event_type').optional().isString(),
    (0, express_validator_1.query)('status').optional().isString(),
    (0, express_validator_1.query)('start_date').optional().isISO8601(),
    (0, express_validator_1.query)('end_date').optional().isISO8601(),
    (0, express_validator_1.query)('organizer_id').optional().isUUID(),
    (0, express_validator_1.query)('search').optional().isString(),
], validation_1.handleValidationErrors, eventController_1.getEvents);
/**
 * GET /api/events/summary
 * Get event attendance summary for dashboards
 */
router.get('/summary', eventController_1.getEventAttendanceSummary);
/**
 * GET /api/events/:id
 * Get a single event
 */
router.get('/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, eventController_1.getEvent);
/**
 * POST /api/events
 * Create a new event
 */
router.post('/', [
    (0, express_validator_1.body)('event_name').isString().trim().notEmpty().withMessage('Event name is required'),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('event_type')
        .isString()
        .trim()
        .notEmpty(),
    (0, express_validator_1.body)('start_date').isISO8601().withMessage('Valid start date is required'),
    (0, express_validator_1.body)('end_date').isISO8601().withMessage('Valid end date is required'),
    (0, express_validator_1.body)('location_name').optional().isString(),
    (0, express_validator_1.body)('address_line1').optional().isString(),
    (0, express_validator_1.body)('address_line2').optional().isString(),
    (0, express_validator_1.body)('city').optional().isString(),
    (0, express_validator_1.body)('state_province').optional().isString(),
    (0, express_validator_1.body)('postal_code').optional().isString(),
    (0, express_validator_1.body)('country').optional().isString(),
    (0, express_validator_1.body)('capacity').optional().isInt({ min: 1 }),
    (0, express_validator_1.body)('status').optional().isString(),
], validation_1.handleValidationErrors, eventController_1.createEvent);
/**
 * PUT /api/events/:id
 * Update an event
 */
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('event_name').optional().isString().trim().notEmpty(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('event_type').optional().isString(),
    (0, express_validator_1.body)('status').optional().isString(),
    (0, express_validator_1.body)('start_date').optional().isISO8601(),
    (0, express_validator_1.body)('end_date').optional().isISO8601(),
    (0, express_validator_1.body)('location_name').optional().isString(),
    (0, express_validator_1.body)('address_line1').optional().isString(),
    (0, express_validator_1.body)('address_line2').optional().isString(),
    (0, express_validator_1.body)('city').optional().isString(),
    (0, express_validator_1.body)('state_province').optional().isString(),
    (0, express_validator_1.body)('postal_code').optional().isString(),
    (0, express_validator_1.body)('country').optional().isString(),
    (0, express_validator_1.body)('capacity').optional().isInt({ min: 1 }),
], validation_1.handleValidationErrors, eventController_1.updateEvent);
/**
 * DELETE /api/events/:id
 * Cancel an event
 */
router.delete('/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, eventController_1.deleteEvent);
/**
 * GET /api/events/:id/registrations
 * Get registrations for an event
 */
router.get('/:id/registrations', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.query)('status').optional().isString(),
], validation_1.handleValidationErrors, eventController_1.getEventRegistrations);
/**
 * POST /api/events/:id/register
 * Register for an event
 */
router.post('/:id/register', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('contact_id').optional().isUUID(),
    (0, express_validator_1.body)('attendee_name').isString().trim().notEmpty().withMessage('Attendee name is required'),
    (0, express_validator_1.body)('attendee_email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('attendee_phone').optional().isString(),
    (0, express_validator_1.body)('notes').optional().isString(),
], validation_1.handleValidationErrors, eventController_1.registerForEvent);
/**
 * PUT /api/events/registrations/:id
 * Update a registration
 */
router.put('/registrations/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('status').optional().isIn(['registered', 'confirmed', 'attended', 'no_show', 'cancelled']),
    (0, express_validator_1.body)('notes').optional().isString(),
    (0, express_validator_1.body)('attendee_name').optional().isString(),
    (0, express_validator_1.body)('attendee_email').optional().isEmail(),
    (0, express_validator_1.body)('attendee_phone').optional().isString(),
], validation_1.handleValidationErrors, eventController_1.updateRegistration);
/**
 * POST /api/events/registrations/:id/checkin
 * Check in an attendee
 */
router.post('/registrations/:id/checkin', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, eventController_1.checkInAttendee);
/**
 * DELETE /api/events/registrations/:id
 * Cancel a registration
 */
router.delete('/registrations/:id', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, eventController_1.cancelRegistration);
/**
 * GET /api/events/:id/attendance
 * Get attendance statistics
 */
router.get('/:id/attendance', [(0, express_validator_1.param)('id').isUUID()], validation_1.handleValidationErrors, eventController_1.getAttendanceStats);
/**
 * GET /api/events/registrations
 * Get all registrations with filtering
 */
router.get('/registrations', [
    (0, express_validator_1.query)('event_id').optional().isUUID(),
    (0, express_validator_1.query)('contact_id').optional().isUUID(),
    (0, express_validator_1.query)('status').optional().isString(),
    (0, express_validator_1.query)('start_date').optional().isISO8601(),
    (0, express_validator_1.query)('end_date').optional().isISO8601(),
], validation_1.handleValidationErrors, eventController_1.getRegistrations);
exports.default = router;
//# sourceMappingURL=events.js.map