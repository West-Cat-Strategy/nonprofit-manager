import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, notFoundMessage, serviceUnavailable } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { socialMediaService } from '../services/socialMediaService';

const handleKnownError = (res: Response, error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message.includes('not configured')) {
    serviceUnavailable(res, error.message);
    return true;
  }

  if (error.message.includes('not found')) {
    notFoundMessage(res, error.message);
    return true;
  }

  if (error.message.includes('required') || error.message.includes('invalid')) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};

const requireOrganizationId = (req: AuthRequest): string => {
  if (!req.organizationId) {
    throw new Error('Active organization context is required');
  }
  return req.organizationId;
};

export const getFacebookSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await socialMediaService.getFacebookSettings(requireOrganizationId(req));
    sendSuccess(res, settings);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const updateFacebookSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await socialMediaService.updateFacebookSettings(
      requireOrganizationId(req),
      req.body,
      req.user!.id
    );
    sendSuccess(res, settings);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const testFacebookSettings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await socialMediaService.testFacebookSettings(requireOrganizationId(req));
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const discoverFacebookPages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pages = await socialMediaService.discoverFacebookPages(
      requireOrganizationId(req),
      req.user!.id
    );
    sendSuccess(res, {
      pages,
      discoveredCount: pages.length,
    });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const listFacebookPages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pages = await socialMediaService.listFacebookPages(requireOrganizationId(req));
    sendSuccess(res, { pages });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const getFacebookPageSnapshots = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as { limit?: number };
    const snapshots = await socialMediaService.getFacebookPageSnapshots(
      requireOrganizationId(req),
      String((req.validatedParams ?? req.params).pageId),
      typeof query.limit === 'number' ? query.limit : 30
    );
    sendSuccess(res, { snapshots });
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const syncFacebookPage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = await socialMediaService.syncFacebookPage(
      requireOrganizationId(req),
      String((req.validatedParams ?? req.params).pageId),
      req.user?.id || null
    );
    sendSuccess(res, page);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};
