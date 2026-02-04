/**
 * Volunteer Controller
 * Handles HTTP requests for volunteer management
 */

import { Response, NextFunction } from 'express';
import { VolunteerService } from '../services/volunteerService';
import pool from '../config/database';
import {
  AssignmentFilters,
  AvailabilityStatus,
  BackgroundCheckStatus,
  PaginationParams,
  VolunteerFilters,
} from '../types/volunteer';
import { AuthRequest } from '../middleware/auth';
import { getString, getBoolean } from '../utils/queryHelpers';
import { notFound, badRequest } from '../utils/responseHelpers';
import type { DataScopeFilter } from '../types/dataScope';

const volunteerService = new VolunteerService(pool);

/**
 * GET /api/volunteers
 * Get all volunteers with filtering and pagination
 */

export const getVolunteers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: VolunteerFilters = {
      search: getString(req.query.search),
      skills: getString(req.query.skills)?.split(','),
      availability_status: getString(req.query.availability_status) as AvailabilityStatus | undefined,
      background_check_status: getString(req.query.background_check_status) as
        | BackgroundCheckStatus
        | undefined,
      is_active: getBoolean(req.query.is_active),
    };

    const pagination: PaginationParams = {
      page: getString(req.query.page) ? parseInt(req.query.page as string) : undefined,
      limit: getString(req.query.limit) ? parseInt(req.query.limit as string) : undefined,
      sort_by: getString(req.query.sort_by),
      sort_order: getString(req.query.sort_order) as 'asc' | 'desc' | undefined,
    };

    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const result = await volunteerService.getVolunteers(filters, pagination, scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/volunteers/:id
 * Get volunteer by ID
 */
export const getVolunteerById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const volunteer = await volunteerService.getVolunteerById(req.params.id, scope);

    if (!volunteer) {
      notFound(res, 'Volunteer');
      return;
    }

    res.json(volunteer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/volunteers/search/skills
 * Find volunteers by skills (skill matching)
 */
export const findVolunteersBySkills = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const skills = getString(req.query.skills)?.split(',') ?? [];

    if (skills.length === 0) {
      badRequest(res, 'Skills parameter is required');
      return;
    }

    const volunteers = await volunteerService.findVolunteersBySkills(skills);
    res.json(volunteers);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/volunteers
 * Create new volunteer
 */
export const createVolunteer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const volunteer = await volunteerService.createVolunteer(req.body, userId);
    res.status(201).json(volunteer);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/volunteers/:id
 * Update volunteer
 */
export const updateVolunteer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const volunteer = await volunteerService.updateVolunteer(req.params.id, req.body, userId);

    if (!volunteer) {
      notFound(res, 'Volunteer');
      return;
    }

    res.json(volunteer);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/volunteers/:id
 * Soft delete volunteer
 */
export const deleteVolunteer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const success = await volunteerService.deleteVolunteer(req.params.id, userId);

    if (!success) {
      notFound(res, 'Volunteer');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/volunteers/:id/assignments
 * Get assignments for a volunteer
 */
export const getVolunteerAssignments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: AssignmentFilters = {
      volunteer_id: req.params.id,
    };

    const assignments = await volunteerService.getVolunteerAssignments(filters);
    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/volunteers/assignments
 * Create volunteer assignment
 */
export const createAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const assignment = await volunteerService.createAssignment(req.body, userId);
    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/volunteers/assignments/:id
 * Update assignment (log hours, change status)
 */
export const updateAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const assignment = await volunteerService.updateAssignment(req.params.id, req.body, userId);

    if (!assignment) {
      notFound(res, 'Assignment');
      return;
    }

    res.json(assignment);
  } catch (error) {
    next(error);
  }
};
