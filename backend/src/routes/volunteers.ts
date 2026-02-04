/**
 * Volunteer Routes
 * API routes for volunteer management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getVolunteers,
  getVolunteerById,
  findVolunteersBySkills,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  getVolunteerAssignments,
  createAssignment,
  updateAssignment,
} from '../controllers/volunteerController';
import { authenticate } from '../middleware/auth';
import { loadDataScope } from '../middleware/dataScope';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('volunteers'));

/**
 * GET /api/volunteers/search/skills
 * Find volunteers by skills (must be before /:id route)
 */
router.get(
  '/search/skills',
  [query('skills').notEmpty().withMessage('Skills parameter is required')],
  findVolunteersBySkills
);

/**
 * GET /api/volunteers
 * Get all volunteers with filtering and pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sort_by').optional().isString(),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('search').optional().isString(),
    query('skills').optional().isString(),
    query('availability_status').optional().isIn(['available', 'unavailable', 'limited']),
    query('background_check_status')
      .optional()
      .isIn(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']),
    query('is_active').optional().isBoolean(),
  ],
  getVolunteers
);

/**
 * GET /api/volunteers/:id
 * Get volunteer by ID
 */
router.get('/:id', [param('id').isUUID()], getVolunteerById);

/**
 * GET /api/volunteers/:id/assignments
 * Get assignments for a volunteer
 */
router.get('/:id/assignments', [param('id').isUUID()], getVolunteerAssignments);

/**
 * POST /api/volunteers
 * Create new volunteer
 */
router.post(
  '/',
  [
    body('contact_id').isUUID().withMessage('Valid contact_id is required'),
    body('skills').optional().isArray(),
    body('skills.*').optional().isString(),
    body('availability_status').optional().isIn(['available', 'unavailable', 'limited']),
    body('availability_notes').optional().isString().trim(),
    body('background_check_status')
      .optional()
      .isIn(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']),
    body('background_check_date').optional().isISO8601(),
    body('background_check_expiry').optional().isISO8601(),
    body('preferred_roles').optional().isArray(),
    body('max_hours_per_week').optional().isInt({ min: 0 }),
    body('emergency_contact_name').optional().isString().trim(),
    body('emergency_contact_phone').optional().isString().trim(),
    body('emergency_contact_relationship').optional().isString().trim(),
  ],
  createVolunteer
);

/**
 * PUT /api/volunteers/:id
 * Update volunteer
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('skills').optional().isArray(),
    body('skills.*').optional().isString(),
    body('availability_status').optional().isIn(['available', 'unavailable', 'limited']),
    body('availability_notes').optional().isString().trim(),
    body('background_check_status')
      .optional()
      .isIn(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']),
    body('background_check_date').optional().isISO8601(),
    body('background_check_expiry').optional().isISO8601(),
    body('preferred_roles').optional().isArray(),
    body('max_hours_per_week').optional().isInt({ min: 0 }),
    body('emergency_contact_name').optional().isString().trim(),
    body('emergency_contact_phone').optional().isString().trim(),
    body('emergency_contact_relationship').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
  ],
  updateVolunteer
);

/**
 * DELETE /api/volunteers/:id
 * Soft delete volunteer
 */
router.delete('/:id', [param('id').isUUID()], deleteVolunteer);

/**
 * POST /api/volunteers/assignments
 * Create volunteer assignment
 */
router.post(
  '/assignments',
  [
    body('volunteer_id').isUUID(),
    body('event_id').optional().isUUID(),
    body('task_id').optional().isUUID(),
    body('assignment_type').isIn(['event', 'task', 'general']),
    body('role').optional().isString().trim(),
    body('start_time').isISO8601(),
    body('end_time').optional().isISO8601(),
    body('notes').optional().isString().trim(),
  ],
  createAssignment
);

/**
 * PUT /api/volunteers/assignments/:id
 * Update assignment
 */
router.put(
  '/assignments/:id',
  [
    param('id').isUUID(),
    body('role').optional().isString().trim(),
    body('start_time').optional().isISO8601(),
    body('end_time').optional().isISO8601(),
    body('hours_logged').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
    body('notes').optional().isString().trim(),
  ],
  updateAssignment
);

export default router;
