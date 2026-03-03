import type { NextFunction, Response } from 'express';
import type {
  AvailabilityStatus,
  BackgroundCheckStatus,
  PaginationParams,
  VolunteerFilters,
} from '@app-types/volunteer';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { AuthRequest } from '@middleware/auth';
import { extractPagination, getBoolean, getString } from '@utils/queryHelpers';
import { VolunteerCatalogUseCase } from '../usecases/volunteerCatalog.usecase';
import { VolunteerLifecycleUseCase } from '../usecases/volunteerLifecycle.usecase';
import { type ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createVolunteersController = (
  catalogUseCase: VolunteerCatalogUseCase,
  lifecycleUseCase: VolunteerLifecycleUseCase,
  mode: ResponseMode
) => {
  const getVolunteers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = ((req as any).validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: VolunteerFilters = {
        search: getString(query.search),
        skills: getString(query.skills)?.split(','),
        availability_status: getString(query.availability_status) as AvailabilityStatus | undefined,
        background_check_status: getString(query.background_check_status) as
          | BackgroundCheckStatus
          | undefined,
        is_active: getBoolean(query.is_active),
      };

      const pagination: PaginationParams = extractPagination(query);
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const result = await catalogUseCase.list(filters, pagination, scope);
      sendData(res, mode, result);
    } catch (error) {
      next(error);
    }
  };

  const getVolunteerById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const volunteer = await catalogUseCase.getById(req.params.id, scope);
      if (!volunteer) {
        sendFailure(res, mode, 'not_found', 'Volunteer not found', 404);
        return;
      }

      sendData(res, mode, volunteer);
    } catch (error) {
      next(error);
    }
  };

  const findVolunteersBySkills = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = ((req as any).validatedQuery ?? req.query) as { skills?: string };
      const skills = getString(query.skills)
        ?.split(',')
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0) || [];

      if (skills.length === 0) {
        sendFailure(res, mode, 'bad_request', 'Skills parameter is required', 400);
        return;
      }

      const volunteers = await catalogUseCase.findBySkills(skills);
      sendData(res, mode, volunteers);
    } catch (error) {
      next(error);
    }
  };

  const createVolunteer = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const volunteer = await lifecycleUseCase.create(req.body, userId);
      sendData(res, mode, volunteer, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateVolunteer = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const volunteer = await lifecycleUseCase.update(req.params.id, req.body, userId);
      if (!volunteer) {
        sendFailure(res, mode, 'not_found', 'Volunteer not found', 404);
        return;
      }

      sendData(res, mode, volunteer);
    } catch (error) {
      next(error);
    }
  };

  const deleteVolunteer = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const deleted = await lifecycleUseCase.delete(req.params.id, userId);
      if (!deleted) {
        sendFailure(res, mode, 'not_found', 'Volunteer not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const getVolunteerAssignments = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const assignments = await catalogUseCase.listAssignments({ volunteer_id: req.params.id });
      sendData(res, mode, assignments);
    } catch (error) {
      next(error);
    }
  };

  const createAssignment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const assignment = await lifecycleUseCase.createAssignment(req.body, userId);
      sendData(res, mode, assignment, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateAssignment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const assignment = await lifecycleUseCase.updateAssignment(req.params.id, req.body, userId);
      if (!assignment) {
        sendFailure(res, mode, 'not_found', 'Assignment not found', 404);
        return;
      }

      sendData(res, mode, assignment);
    } catch (error) {
      next(error);
    }
  };

  return {
    getVolunteers,
    getVolunteerById,
    findVolunteersBySkills,
    createVolunteer,
    updateVolunteer,
    deleteVolunteer,
    getVolunteerAssignments,
    createAssignment,
    updateAssignment,
  };
};
