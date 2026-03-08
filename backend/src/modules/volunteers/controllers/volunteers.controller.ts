import type { NextFunction, Response } from 'express';
import type {
  AvailabilityStatus,
  BackgroundCheckStatus,
  PaginationParams,
  VolunteerFilters,
} from '@app-types/volunteer';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { AuthRequest } from '@middleware/auth';
import { setTabularDownloadHeaders } from '@modules/shared/export/tabularExport';
import { parseMultipartJsonField } from '@modules/shared/import/peopleImportParser';
import { extractPagination, getBoolean, getString } from '@utils/queryHelpers';
import { VolunteerCatalogUseCase } from '../usecases/volunteerCatalog.usecase';
import { VolunteerImportExportUseCase } from '../usecases/volunteerImportExport.usecase';
import { VolunteerLifecycleUseCase } from '../usecases/volunteerLifecycle.usecase';
import { type ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createVolunteersController = (
  catalogUseCase: VolunteerCatalogUseCase,
  lifecycleUseCase: VolunteerLifecycleUseCase,
  importExportUseCase: VolunteerImportExportUseCase,
  mode: ResponseMode
) => {
  const getVolunteers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
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
      const query = (req.validatedQuery ?? req.query) as { skills?: string };
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

  const exportVolunteers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        sendFailure(res, mode, 'bad_request', 'Organization context required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const file = await importExportUseCase.exportVolunteers(req.body, organizationId, scope);
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  const downloadImportTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = (req.validatedQuery ?? req.query) as { format?: 'csv' | 'xlsx' };
      const file = await importExportUseCase.getImportTemplate(query.format || 'csv');
      setTabularDownloadHeaders(res, file);
      res.send(file.buffer);
    } catch (error) {
      next(error);
    }
  };

  const previewImport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        sendFailure(res, mode, 'bad_request', 'Organization context required', 400);
        return;
      }

      if (!req.file) {
        sendFailure(res, mode, 'validation_error', 'Import file is required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const mapping = parseMultipartJsonField<Record<string, unknown>>(req.body.mapping);
      const preview = await importExportUseCase.previewImport(req.file, mapping, organizationId, scope);
      sendData(res, mode, preview);
    } catch (error) {
      next(error);
    }
  };

  const commitImport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      const userId = req.user?.id;
      if (!organizationId) {
        sendFailure(res, mode, 'bad_request', 'Organization context required', 400);
        return;
      }

      if (!userId) {
        sendFailure(res, mode, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      if (!req.file) {
        sendFailure(res, mode, 'validation_error', 'Import file is required', 400);
        return;
      }

      const scope = req.dataScope?.filter as DataScopeFilter | undefined;
      const mapping = parseMultipartJsonField<Record<string, unknown>>(req.body.mapping);
      const result = await importExportUseCase.commitImport(
        req.file,
        mapping,
        userId,
        organizationId,
        scope
      );
      sendData(res, mode, result);
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
    exportVolunteers,
    downloadImportTemplate,
    previewImport,
    commitImport,
  };
};
