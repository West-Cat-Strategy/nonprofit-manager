import { NextFunction, Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import type { CaseFilter } from '@app-types/case';
import { PAGINATION } from '@config/constants';
import { CaseCatalogUseCase } from '../usecases/caseCatalog.usecase';
import { ResponseMode, sendData, sendFailure } from '../mappers/responseMode';

const getSingleParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseBoolean = (value?: string): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const createCaseCatalogController = (
  useCase: CaseCatalogUseCase,
  mode: ResponseMode
) => {
  const getCases = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as Record<string, string | string[] | undefined>;
      const filter: CaseFilter = {
        search: getSingleParam(query.search),
        contact_id: getSingleParam(query.contact_id),
        account_id: getSingleParam(query.account_id),
        case_type_id: getSingleParam(query.case_type_id),
        status_id: getSingleParam(query.status_id),
        priority: getSingleParam(query.priority) as CaseFilter['priority'],
        assigned_to: getSingleParam(query.assigned_to),
        assigned_team: getSingleParam(query.assigned_team),
        is_urgent: parseBoolean(getSingleParam(query.is_urgent)),
        requires_followup: parseBoolean(getSingleParam(query.requires_followup)),
        intake_start_date: getSingleParam(query.intake_start_date),
        intake_end_date: getSingleParam(query.intake_end_date),
        due_date_start: getSingleParam(query.due_date_start),
        due_date_end: getSingleParam(query.due_date_end),
        quick_filter: getSingleParam(query.quick_filter) as CaseFilter['quick_filter'],
        due_within_days: parseNumber(getSingleParam(query.due_within_days)),
        page: parseNumber(getSingleParam(query.page)),
        limit: parseNumber(getSingleParam(query.limit)),
        sort_by: getSingleParam(query.sort_by),
        sort_order: getSingleParam(query.sort_order) as CaseFilter['sort_order'],
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

  const getCaseSummary = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await useCase.summary();
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
