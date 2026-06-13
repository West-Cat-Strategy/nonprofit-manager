import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import {
  RelatedToType,
  type TaskFilters,
  TaskPriority,
  TaskStatus,
} from '@app-types/task';
import { getBoolean, getInteger, getString } from '@utils/queryHelpers';
import { TaskCatalogUseCase } from '../usecases/taskCatalog.usecase';
import { TaskLifecycleUseCase } from '../usecases/taskLifecycle.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';

const parseTaskStatus = (value: string | undefined): TaskStatus | undefined => {
  if (!value) return undefined;
  const allowed: TaskStatus[] = [
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.WAITING,
    TaskStatus.COMPLETED,
    TaskStatus.DEFERRED,
    TaskStatus.CANCELLED,
  ];
  return allowed.includes(value as TaskStatus) ? (value as TaskStatus) : undefined;
};

const parseTaskPriority = (value: string | undefined): TaskPriority | undefined => {
  if (!value) return undefined;
  const allowed: TaskPriority[] = [
    TaskPriority.LOW,
    TaskPriority.NORMAL,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ];
  return allowed.includes(value as TaskPriority) ? (value as TaskPriority) : undefined;
};

const parseRelatedToType = (value: string | undefined): RelatedToType | undefined => {
  if (!value) return undefined;
  const allowed: RelatedToType[] = [
    RelatedToType.ACCOUNT,
    RelatedToType.CONTACT,
    RelatedToType.EVENT,
    RelatedToType.DONATION,
    RelatedToType.VOLUNTEER,
  ];
  return allowed.includes(value as RelatedToType) ? (value as RelatedToType) : undefined;
};

const getActiveOrganizationId = (req: AuthRequest, res: Response): string | null => {
  const organizationId = req.organizationId || req.accountId || req.tenantId;
  if (!organizationId) {
    sendFailure(res, 'bad_request', 'No organization context', 400);
    return null;
  }

  return organizationId;
};

export const createTasksController = (
  catalogUseCase: TaskCatalogUseCase,
  lifecycleUseCase: TaskLifecycleUseCase
) => {
  const getTasks = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: TaskFilters = {
        organization_id: organizationId,
        search: getString(query.search),
        status: parseTaskStatus(getString(query.status)),
        priority: parseTaskPriority(getString(query.priority)),
        assigned_to: getString(query.assigned_to),
        related_to_type: parseRelatedToType(getString(query.related_to_type)),
        related_to_id: getString(query.related_to_id),
        due_before: getString(query.due_before),
        due_after: getString(query.due_after),
        overdue: getBoolean(query.overdue),
        page: getInteger(query.page),
        limit: getInteger(query.limit),
      };

      const result = await catalogUseCase.list(filters);
      sendData(res, result);
    } catch (error) {
      next(error);
    }
  };

  const getTaskSummary = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
      const filters: TaskFilters = {
        organization_id: organizationId,
        assigned_to: getString(query.assigned_to),
        related_to_type: parseRelatedToType(getString(query.related_to_type)),
        related_to_id: getString(query.related_to_id),
      };

      const summary = await catalogUseCase.summary(filters);
      sendData(res, summary);
    } catch (error) {
      next(error);
    }
  };

  const getTaskById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const task = await catalogUseCase.getById(req.params.id, organizationId);
      if (!task) {
        sendFailure(res, 'not_found', 'Task not found', 404);
        return;
      }

      sendData(res, task);
    } catch (error) {
      next(error);
    }
  };

  const createTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const task = await lifecycleUseCase.create(req.body, userId, organizationId);
      sendData(res, task, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const task = await lifecycleUseCase.update(req.params.id, req.body, userId, organizationId);
      if (!task) {
        sendFailure(res, 'not_found', 'Task not found', 404);
        return;
      }

      sendData(res, task);
    } catch (error) {
      next(error);
    }
  };

  const deleteTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const success = await lifecycleUseCase.delete(req.params.id, organizationId);
      if (!success) {
        sendFailure(res, 'not_found', 'Task not found', 404);
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const completeTask = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = getActiveOrganizationId(req, res);
      if (!organizationId) return;

      const userId = req.user?.id;
      if (!userId) {
        sendFailure(res, 'unauthorized', 'User not authenticated', 401);
        return;
      }

      const task = await lifecycleUseCase.complete(req.params.id, userId, organizationId);
      if (!task) {
        sendFailure(res, 'not_found', 'Task not found', 404);
        return;
      }

      sendData(res, task);
    } catch (error) {
      next(error);
    }
  };

  return {
    getTasks,
    getTaskSummary,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  };
};
