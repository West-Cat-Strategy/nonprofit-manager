"use strict";
/**
 * Volunteer Routes
 * API routes for volunteer management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const volunteerController_1 = require("../controllers/volunteerController");
const auth_1 = require("../middleware/auth");
const dataScope_1 = require("../middleware/dataScope");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use((0, dataScope_1.loadDataScope)('volunteers'));
/**
 * GET /api/volunteers/search/skills
 * Find volunteers by skills (must be before /:id route)
 */
router.get('/search/skills', [(0, express_validator_1.query)('skills').notEmpty().withMessage('Skills parameter is required')], volunteerController_1.findVolunteersBySkills);
/**
 * GET /api/volunteers
 * Get all volunteers with filtering and pagination
 */
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('sort_by').optional().isString(),
    (0, express_validator_1.query)('sort_order').optional().isIn(['asc', 'desc']),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('skills').optional().isString(),
    (0, express_validator_1.query)('availability_status').optional().isIn(['available', 'unavailable', 'limited']),
    (0, express_validator_1.query)('background_check_status')
        .optional()
        .isIn(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']),
    (0, express_validator_1.query)('is_active').optional().isBoolean(),
], volunteerController_1.getVolunteers);
/**
 * GET /api/volunteers/:id
 * Get volunteer by ID
 */
router.get('/:id', [(0, express_validator_1.param)('id').isUUID()], volunteerController_1.getVolunteerById);
/**
 * GET /api/volunteers/:id/assignments
 * Get assignments for a volunteer
 */
router.get('/:id/assignments', [(0, express_validator_1.param)('id').isUUID()], volunteerController_1.getVolunteerAssignments);
/**
 * POST /api/volunteers
 * Create new volunteer
 */
router.post('/', [
    (0, express_validator_1.body)('contact_id').isUUID().withMessage('Valid contact_id is required'),
    (0, express_validator_1.body)('skills').optional().isArray(),
    (0, express_validator_1.body)('skills.*').optional().isString(),
    (0, express_validator_1.body)('availability_status').optional().isIn(['available', 'unavailable', 'limited']),
    (0, express_validator_1.body)('availability_notes').optional().isString().trim(),
    (0, express_validator_1.body)('background_check_status')
        .optional()
        .isIn(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']),
    (0, express_validator_1.body)('background_check_date').optional().isISO8601(),
    (0, express_validator_1.body)('background_check_expiry').optional().isISO8601(),
    (0, express_validator_1.body)('preferred_roles').optional().isArray(),
    (0, express_validator_1.body)('max_hours_per_week').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('emergency_contact_name').optional().isString().trim(),
    (0, express_validator_1.body)('emergency_contact_phone').optional().isString().trim(),
    (0, express_validator_1.body)('emergency_contact_relationship').optional().isString().trim(),
], volunteerController_1.createVolunteer);
/**
 * PUT /api/volunteers/:id
 * Update volunteer
 */
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('skills').optional().isArray(),
    (0, express_validator_1.body)('skills.*').optional().isString(),
    (0, express_validator_1.body)('availability_status').optional().isIn(['available', 'unavailable', 'limited']),
    (0, express_validator_1.body)('availability_notes').optional().isString().trim(),
    (0, express_validator_1.body)('background_check_status')
        .optional()
        .isIn(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']),
    (0, express_validator_1.body)('background_check_date').optional().isISO8601(),
    (0, express_validator_1.body)('background_check_expiry').optional().isISO8601(),
    (0, express_validator_1.body)('preferred_roles').optional().isArray(),
    (0, express_validator_1.body)('max_hours_per_week').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('emergency_contact_name').optional().isString().trim(),
    (0, express_validator_1.body)('emergency_contact_phone').optional().isString().trim(),
    (0, express_validator_1.body)('emergency_contact_relationship').optional().isString().trim(),
    (0, express_validator_1.body)('is_active').optional().isBoolean(),
], volunteerController_1.updateVolunteer);
/**
 * DELETE /api/volunteers/:id
 * Soft delete volunteer
 */
router.delete('/:id', [(0, express_validator_1.param)('id').isUUID()], volunteerController_1.deleteVolunteer);
/**
 * POST /api/volunteers/assignments
 * Create volunteer assignment
 */
router.post('/assignments', [
    (0, express_validator_1.body)('volunteer_id').isUUID(),
    (0, express_validator_1.body)('event_id').optional().isUUID(),
    (0, express_validator_1.body)('task_id').optional().isUUID(),
    (0, express_validator_1.body)('assignment_type').isIn(['event', 'task', 'general']),
    (0, express_validator_1.body)('role').optional().isString().trim(),
    (0, express_validator_1.body)('start_time').isISO8601(),
    (0, express_validator_1.body)('end_time').optional().isISO8601(),
    (0, express_validator_1.body)('notes').optional().isString().trim(),
], volunteerController_1.createAssignment);
/**
 * PUT /api/volunteers/assignments/:id
 * Update assignment
 */
router.put('/assignments/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('role').optional().isString().trim(),
    (0, express_validator_1.body)('start_time').optional().isISO8601(),
    (0, express_validator_1.body)('end_time').optional().isISO8601(),
    (0, express_validator_1.body)('hours_logged').optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    (0, express_validator_1.body)('notes').optional().isString().trim(),
], volunteerController_1.updateAssignment);
exports.default = router;
//# sourceMappingURL=volunteers.js.map