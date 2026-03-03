import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CaseFilter } from '@app-types/case';
import { PAGINATION } from '@config/constants';
import { CaseCatalogUseCase } from '../usecases/caseCatalog.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

export const createCaseCatalogController = (
  useCase: CaseCatalogUseCase,
  mode: ResponseMode
) => {
  const getCases = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = ((req as any).validatedQuery ?? req.query) as {
        search?: string;
        contact_id?: string;
        account_id?: string;
        case_type_id?: string;
        status_id?: string;
        priority?: CaseFilter['priority'];
        assigned_to?: string;
        assigned_team?: string;
        is_urgent?: boolean;
        requires_followup?: boolean;
        intake_start_date?: string;
        intake_end_date?: string;
        due_date_start?: string;
        due_date_end?: string;
        quick_filter?: CaseFilter['quick_filter'];
        due_within_days?: number;
        page?: number;
        limit?: number;
        sort_by?: string;
        sort_order?: CaseFilter['sort_order'];
      };
      const filter: CaseFilter = {
        search: query.search,
        contact_id: query.contact_id,
        account_id: query.account_id,
        case_type_id: query.case_type_id,
        status_id: query.status_id,
        priority: query.priority,
        assigned_to: query.assigned_to,
        assigned_team: query.assigned_team,
        is_urgent: query.is_urgent,
        requires_followup: query.requires_followup,
        intake_start_date: query.intake_start_date,
        intake_end_date: query.intake_end_date,
        due_date_start: query.due_date_start,
        due_date_end: query.due_date_end,
        quick_filter: query.quick_filter,
        due_within_days: query.due_within_days,
        page: query.page,
        limit: query.limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      };

      const { cases, total } = await useCase.list(filter);
      const payload = {
        cases,
        total,
        pagination: {
          page: Number(filter.page || 1),
          limit: Number(filter.limit || PAGINATION.DEFAULT_LIMIT),
        },
      };
      sendData(res, mode, payload);
    } catch (error) {
      next(error);
    }
  };

  const getCaseById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const caseData = await useCase.getById(req.params.id);
      if (!caseData) {
        sendFailure(res, mode, 'NOT_FOUND', 'Case not found', 404);
        return;
      }
      sendData(res, mode, caseData);
    } catch (error) {
      next(error);
    }
  };

  const getCaseTimeline = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timeline = await useCase.timeline(req.params.id);
      sendData(res, mode, mode === 'v2' ? timeline : { timeline });
    } catch (error) {
      next(error);
    }
  };

  const getCaseSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.organizationId || req.accountId || req.tenantId;
      const summary = await useCase.summary(organizationId);
      sendData(res, mode, summary);
    } catch (error) {
      next(error);
    }
  };

  const getCaseTypes = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const types = await useCase.types();
      sendData(res, mode, mode === 'v2' ? types : { types });
    } catch (error) {
      next(error);
    }
  };

  const getCaseStatuses = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statuses = await useCase.statuses();
      sendData(res, mode, mode === 'v2' ? statuses : { statuses });
    } catch (error) {
      next(error);
    }
  };

  return {
    getCases,
    getCaseById,
    getCaseTimeline,
    getCaseSummary,
    getCaseTypes,
    getCaseStatuses,
  };
};
