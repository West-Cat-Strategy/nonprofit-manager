import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { caseService } from '@services/domains/engagement';
import { appendAuditLog } from '@services/auditService';
import type {
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseFilter,
  CreateCaseNoteDTO,
  UpdateCaseStatusDTO,
  CreateCaseMilestoneDTO,
  UpdateCaseMilestoneDTO,
  ReassignCaseDTO,
  BulkStatusUpdateDTO,
  CreateCaseRelationshipDTO,
  CreateCaseServiceDTO,
  UpdateCaseServiceDTO
} from '@app-types/case';
import { logger } from '@config/logger';
import pool from '@config/database';
import { PAGINATION } from '@config/constants';
import { badRequest, notFound, serverError } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

const getRequestUserAgent = (req: AuthRequest): string | null => {
  const userAgent = req.headers['user-agent'];
  if (Array.isArray(userAgent)) {
    return userAgent[0] || null;
  }
  return userAgent || null;
};

const getRequestIp = (req: AuthRequest): string | null => {
  return req.ip || req.connection.remoteAddress || null;
};

export const createCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateCaseDTO;
    const userId = req.user?.id;
    const newCase = await caseService.createCase(data, userId);

    await appendAuditLog(pool, {
      action: 'case_created',
      resourceType: 'case',
      resourceId: (newCase as { id?: string }).id || null,
      userId: userId || null,
      details: {
        title: (newCase as { title?: string }).title || data.title || null,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, newCase, 201);
  } catch (error) {
    logger.error('Error creating case:', error);
    serverError(res, 'Failed to create case');
  }
};

export const getCases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query as Record<string, string | string[] | undefined>;
    const getParam = (key: string) => {
      const value = query[key];
      return Array.isArray(value) ? value[0] : value;
    };
    const parseBoolean = (value?: string) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    };
    const parseNumber = (value?: string) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const filter: CaseFilter = {
      search: getParam('search'),
      contact_id: getParam('contact_id'),
      account_id: getParam('account_id'),
      case_type_id: getParam('case_type_id'),
      status_id: getParam('status_id'),
      priority: getParam('priority') as CaseFilter['priority'],
      assigned_to: getParam('assigned_to'),
      assigned_team: getParam('assigned_team'),
      is_urgent: parseBoolean(getParam('is_urgent')),
      requires_followup: parseBoolean(getParam('requires_followup')),
      intake_start_date: getParam('intake_start_date'),
      intake_end_date: getParam('intake_end_date'),
      due_date_start: getParam('due_date_start'),
      due_date_end: getParam('due_date_end'),
      quick_filter: getParam('quick_filter') as CaseFilter['quick_filter'],
      due_within_days: parseNumber(getParam('due_within_days')),
      page: parseNumber(getParam('page')),
      limit: parseNumber(getParam('limit')),
      sort_by: getParam('sort_by'),
      sort_order: getParam('sort_order') as CaseFilter['sort_order'],
    };
    const { cases, total } = await caseService.getCases(filter);
    sendSuccess(res, {
      cases,
      total,
      pagination: {
        page: parseInt(String(filter.page || 1), 10),
        limit: parseInt(String(filter.limit || PAGINATION.DEFAULT_LIMIT), 10),
      },
    });
  } catch (error) {
    logger.error('Error fetching cases:', error);
    serverError(res, 'Failed to fetch cases');
  }
};

export const getCaseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const caseData = await caseService.getCaseById(id);
    if (!caseData) {
      notFound(res, 'Case');
      return;
    }
    sendSuccess(res, caseData);
  } catch (error) {
    logger.error('Error fetching case:', error);
    serverError(res, 'Failed to fetch case');
  }
};

export const updateCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateCaseDTO;
    const userId = req.user?.id;
    const updated = await caseService.updateCase(id, data, userId);

    await appendAuditLog(pool, {
      action: 'case_updated',
      resourceType: 'case',
      resourceId: id,
      userId: userId || null,
      details: {
        fields: Object.keys(data || {}),
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, updated);
  } catch (error) {
    logger.error('Error updating case:', error);
    serverError(res, 'Failed to update case');
  }
};

export const updateCaseStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateCaseStatusDTO;
    const userId = req.user?.id;
    const updated = await caseService.updateCaseStatus(id, data, userId);

    await appendAuditLog(pool, {
      action: 'case_status_updated',
      resourceType: 'case',
      resourceId: id,
      userId: userId || null,
      details: {
        newStatusId: data.new_status_id,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, updated);
  } catch (error) {
    logger.error('Error updating case status:', error);
    serverError(res, 'Failed to update status');
  }
};

export const getCaseNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notes = await caseService.getCaseNotes(id);
    sendSuccess(res, { notes });
  } catch (error) {
    logger.error('Error fetching case notes:', error);
    serverError(res, 'Failed to fetch notes');
  }
};

export const createCaseNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateCaseNoteDTO;
    const userId = req.user?.id;
    const note = await caseService.createCaseNote(data, userId);
    sendSuccess(res, note, 201);
  } catch (error) {
    logger.error('Error creating case note:', error);
    serverError(res, 'Failed to create note');
  }
};

export const getCaseSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await caseService.getCaseSummary();
    sendSuccess(res, summary);
  } catch (error) {
    logger.error('Error fetching case summary:', error);
    serverError(res, 'Failed to fetch summary');
  }
};

export const getCaseTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const types = await caseService.getCaseTypes();
    sendSuccess(res, { types });
  } catch (error) {
    logger.error('Error fetching case types:', error);
    serverError(res, 'Failed to fetch types');
  }
};

export const getCaseStatuses = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statuses = await caseService.getCaseStatuses();
    sendSuccess(res, { statuses });
  } catch (error) {
    logger.error('Error fetching case statuses:', error);
    serverError(res, 'Failed to fetch statuses');
  }
};

export const deleteCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await caseService.deleteCase(id);

    await appendAuditLog(pool, {
      action: 'case_deleted',
      resourceType: 'case',
      resourceId: id,
      userId: req.user?.id || null,
      details: {
        deleted: true,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, { message: 'Case deleted' });
  } catch (error) {
    logger.error('Error deleting case:', error);
    serverError(res, 'Failed to delete case');
  }
};

export const getCaseMilestones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const milestones = await caseService.getCaseMilestones(id);
    sendSuccess(res, { milestones });
  } catch (error) {
    logger.error('Error fetching milestones:', error);
    serverError(res, 'Failed to fetch milestones');
  }
};

export const createCaseMilestone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as CreateCaseMilestoneDTO;
    const userId = req.user?.id;

    if (!data.milestone_name?.trim()) {
      badRequest(res, 'Milestone name is required', { code: 'validation_error' });
      return;
    }

    const milestone = await caseService.createCaseMilestone(id, data, userId);
    sendSuccess(res, milestone, 201);
  } catch (error) {
    logger.error('Error creating milestone:', error);
    serverError(res, 'Failed to create milestone');
  }
};

export const updateCaseMilestone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    const data = req.body as UpdateCaseMilestoneDTO;
    const milestone = await caseService.updateCaseMilestone(milestoneId, data);
    sendSuccess(res, milestone);
  } catch (error) {
    logger.error('Error updating milestone:', error);
    serverError(res, 'Failed to update milestone');
  }
};

export const deleteCaseMilestone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    await caseService.deleteCaseMilestone(milestoneId);
    sendSuccess(res, { message: 'Milestone deleted' });
  } catch (error) {
    logger.error('Error deleting milestone:', error);
    serverError(res, 'Failed to delete milestone');
  }
};

export const reassignCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as ReassignCaseDTO;
    const userId = req.user?.id;
    const updated = await caseService.reassignCase(id, data.assigned_to, data.reason, userId);

    await appendAuditLog(pool, {
      action: 'case_reassigned',
      resourceType: 'case',
      resourceId: id,
      userId: userId || null,
      details: {
        assignedTo: data.assigned_to || null,
      },
      ipAddress: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      requestId: req.correlationId,
    });

    sendSuccess(res, updated);
  } catch (error) {
    logger.error('Error reassigning case:', error);
    serverError(res, 'Failed to reassign case');
  }
};

export const bulkUpdateCaseStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as BulkStatusUpdateDTO;
    const userId = req.user?.id;

    if (!data.case_ids?.length || !data.new_status_id) {
      badRequest(res, 'case_ids and new_status_id are required', { code: 'validation_error' });
      return;
    }

    const result = await caseService.bulkUpdateStatus(data.case_ids, data.new_status_id, data.notes, userId);
    sendSuccess(res, result);
  } catch (error) {
    logger.error('Error bulk updating cases:', error);
    serverError(res, 'Failed to bulk update cases');
  }
};

export const getCaseRelationships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const relationships = await caseService.getCaseRelationships(id);
    sendSuccess(res, { relationships });
  } catch (error) {
    logger.error('Error fetching case relationships:', error);
    serverError(res, 'Failed to fetch relationships');
  }
};

export const createCaseRelationship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as CreateCaseRelationshipDTO;
    const userId = req.user?.id;
    const relationship = await caseService.createCaseRelationship(id, data, userId);
    sendSuccess(res, relationship, 201);
  } catch (error) {
    logger.error('Error creating case relationship:', error);
    serverError(res, 'Failed to create relationship');
  }
};

export const deleteCaseRelationship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { relationshipId } = req.params;
    await caseService.deleteCaseRelationship(relationshipId);
    sendSuccess(res, { message: 'Relationship deleted' });
  } catch (error) {
    logger.error('Error deleting case relationship:', error);
    serverError(res, 'Failed to delete relationship');
  }
};

export const getCaseServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const services = await caseService.getCaseServices(id);
    sendSuccess(res, { services });
  } catch (error) {
    logger.error('Error fetching case services:', error);
    serverError(res, 'Failed to fetch services');
  }
};

export const createCaseService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body as CreateCaseServiceDTO;
    const userId = req.user?.id;
    const service = await caseService.createCaseService(id, data, userId);
    sendSuccess(res, service, 201);
  } catch (error) {
    logger.error('Error creating case service:', error);
    serverError(res, 'Failed to create service');
  }
};

export const updateCaseService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const data = req.body as UpdateCaseServiceDTO;
    const userId = req.user?.id;
    const service = await caseService.updateCaseService(serviceId, data, userId);
    sendSuccess(res, service);
  } catch (error) {
    logger.error('Error updating case service:', error);
    serverError(res, 'Failed to update service');
  }
};

export const deleteCaseService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    await caseService.deleteCaseService(serviceId);
    sendSuccess(res, { message: 'Service deleted' });
  } catch (error) {
    logger.error('Error deleting case service:', error);
    serverError(res, 'Failed to delete service');
  }
};
