/**
 * Volunteer Routes
 * API routes for volunteer management
 */

import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '@middleware/zodValidation';
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
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import {
  createVolunteerSchema,
  updateVolunteerSchema,
  volunteerAssignmentSchema,
  updateVolunteerAssignmentSchema,
  uuidSchema,
} from '@validations/volunteer';
import { z } from 'zod';

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
  validateQuery(z.object({
    skills: z.string().min(1, 'Skills parameter is required'),
  })),
  findVolunteersBySkills
);

/**
 * GET /api/volunteers
 * Get all volunteers with filtering and pagination
 */
router.get(
  '/',
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    skills: z.string().optional(),
    availability_status: z.enum(['available', 'unavailable', 'limited']).optional(),
    background_check_status: z.enum(['not_required', 'pending', 'in_progress', 'approved', 'rejected', 'expired']).optional(),
    is_active: z.boolean().optional(),
  })),
  getVolunteers
);

/**
 * GET /api/volunteers/:id
 * Get volunteer by ID
 */
router.get(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  getVolunteerById
);

/**
 * GET /api/volunteers/:id/assignments
 * Get assignments for a volunteer
 */
router.get(
  '/:id/assignments',
  validateParams(z.object({ id: uuidSchema })),
  getVolunteerAssignments
);

/**
 * POST /api/volunteers
 * Create new volunteer
 */
router.post(
  '/',
  validateBody(createVolunteerSchema),
  createVolunteer
);

/**
 * PUT /api/volunteers/:id
 * Update volunteer
 */
router.put(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(updateVolunteerSchema),
  updateVolunteer
);

/**
 * DELETE /api/volunteers/:id
 * Soft delete volunteer
 */
router.delete(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  deleteVolunteer
);

/**
 * POST /api/volunteers/assignments
 * Create volunteer assignment
 */
router.post(
  '/assignments',
  validateBody(volunteerAssignmentSchema),
  createAssignment
);

/**
 * PUT /api/volunteers/assignments/:id
 * Update assignment
 */
router.put(
  '/assignments/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(updateVolunteerAssignmentSchema),
  updateAssignment
);

export default router;
