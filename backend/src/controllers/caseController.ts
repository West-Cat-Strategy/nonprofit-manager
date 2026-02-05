import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import * as caseService from '../services/caseService';
import type { CreateCaseDTO, UpdateCaseDTO, CaseFilter, CreateCaseNoteDTO, UpdateCaseStatusDTO } from '../types/case';
import { logger } from '../config/logger';
import { PAGINATION } from '../config/constants';
import { notFound, serverError } from '../utils/responseHelpers';

export const createCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as CreateCaseDTO;
    const userId = req.user?.id;
    const newCase = await caseService.createCase(data, userId);
    res.status(201).json(newCase);
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
    res.json({ cases, total, pagination: { page: parseInt(String(filter.page || 1)), limit: parseInt(String(filter.limit || PAGINATION.DEFAULT_LIMIT)) } });
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
    res.json(caseData);
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
    res.json(updated);
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
    res.json(updated);
  } catch (error) {
    logger.error('Error updating case status:', error);
    serverError(res, 'Failed to update status');
  }
};

export const getCaseNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notes = await caseService.getCaseNotes(id);
    res.json({ notes });
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
    res.status(201).json(note);
  } catch (error) {
    logger.error('Error creating case note:', error);
    serverError(res, 'Failed to create note');
  }
};

export const getCaseSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await caseService.getCaseSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching case summary:', error);
    serverError(res, 'Failed to fetch summary');
  }
};

export const getCaseTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const types = await caseService.getCaseTypes();
    res.json({ types });
  } catch (error) {
    logger.error('Error fetching case types:', error);
    serverError(res, 'Failed to fetch types');
  }
};

export const getCaseStatuses = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statuses = await caseService.getCaseStatuses();
    res.json({ statuses });
  } catch (error) {
    logger.error('Error fetching case statuses:', error);
    serverError(res, 'Failed to fetch statuses');
  }
};

export const deleteCase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await caseService.deleteCase(id);
    res.json({ success: true, message: 'Case deleted' });
  } catch (error) {
    logger.error('Error deleting case:', error);
    serverError(res, 'Failed to delete case');
  }
};
