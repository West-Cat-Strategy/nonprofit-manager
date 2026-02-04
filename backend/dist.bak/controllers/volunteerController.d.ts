/**
 * Volunteer Controller
 * Handles HTTP requests for volunteer management
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/volunteers
 * Get all volunteers with filtering and pagination
 */
export declare const getVolunteers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/volunteers/:id
 * Get volunteer by ID
 */
export declare const getVolunteerById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/volunteers/search/skills
 * Find volunteers by skills (skill matching)
 */
export declare const findVolunteersBySkills: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/volunteers
 * Create new volunteer
 */
export declare const createVolunteer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/volunteers/:id
 * Update volunteer
 */
export declare const updateVolunteer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/volunteers/:id
 * Soft delete volunteer
 */
export declare const deleteVolunteer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/volunteers/:id/assignments
 * Get assignments for a volunteer
 */
export declare const getVolunteerAssignments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/volunteers/assignments
 * Create volunteer assignment
 */
export declare const createAssignment: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/volunteers/assignments/:id
 * Update assignment (log hours, change status)
 */
export declare const updateAssignment: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=volunteerController.d.ts.map