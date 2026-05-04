import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type {
  CreatePublicActionRequest,
  PublicActionSubmissionRequest,
  UpdatePublicActionRequest,
} from '@app-types/websiteBuilder';
import { publicActionService } from '@services/publishing/publicActionService';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

const getUserAgent = (req: Request): string | undefined => {
  const userAgent = req.headers['user-agent'];
  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
};

const getReferrer = (req: Request): string | undefined => {
  const referrer = req.headers.referer;
  return typeof referrer === 'string' ? referrer : undefined;
};

const handleKnownError = (res: Response, error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  if (error.message.includes('not found') || error.message.includes('access denied')) {
    notFoundMessage(res, error.message);
    return true;
  }

  if (
    error.message.includes('organization assignment') ||
    error.message.includes('not accepting') ||
    error.message.includes('required')
  ) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};

export const listSitePublicActions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publicActionService.listActions(
      req.params.siteId,
      req.user!.id,
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const createSitePublicAction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publicActionService.createAction(
      req.params.siteId,
      req.user!.id,
      req.body as CreatePublicActionRequest,
      req.organizationId
    );
    sendSuccess(res, result, 201);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const updateSitePublicAction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publicActionService.updateAction(
      req.params.siteId,
      req.params.actionId,
      req.user!.id,
      req.body as UpdatePublicActionRequest,
      req.organizationId
    );
    if (!result) {
      notFoundMessage(res, 'Public action not found');
      return;
    }
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const listSitePublicActionSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publicActionService.listSubmissions(
      req.params.siteId,
      req.params.actionId,
      req.user!.id,
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const exportSitePublicActionSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const csv = await publicActionService.exportSubmissionsCsv(
      req.params.siteId,
      req.params.actionId,
      req.user!.id,
      req.organizationId
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="public-action-submissions.csv"');
    res.status(200).send(csv);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const getSitePublicActionSupportLetterArtifact = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publicActionService.getSupportLetterArtifact(
      req.params.siteId,
      req.params.actionId,
      req.params.submissionId,
      req.user!.id,
      req.organizationId
    );
    if (!result) {
      notFoundMessage(res, 'Support letter artifact not found');
      return;
    }
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const submitPublicAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteKey, actionSlug } = (req.validatedParams ?? req.params) as {
      siteKey: string;
      actionSlug: string;
    };
    const body = (req.body ?? {}) as PublicActionSubmissionRequest;
    const result = await publicActionService.submitPublicAction(siteKey, actionSlug, body, {
      idempotencyKey:
        typeof req.headers['idempotency-key'] === 'string'
          ? req.headers['idempotency-key']
          : undefined,
      pagePath: typeof body.pagePath === 'string' ? body.pagePath : undefined,
      visitorId: typeof body.visitorId === 'string' ? body.visitorId : undefined,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      referrer: getReferrer(req),
      userAgent: getUserAgent(req),
    });
    sendSuccess(res, result, 201);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};
