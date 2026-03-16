import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import type {
  PublishedSiteSearchParams,
  WebsiteFacebookSettings,
  WebsiteFormOperationalConfig,
  WebsiteMailchimpSettings,
  WebsiteStripeSettings,
} from '@app-types/publishing';
import { publishingService } from '@services/domains/content';
import { websiteSiteSettingsService } from '@services/publishing/siteSettingsService';
import { siteCacheService } from '@services/siteCacheService';
import { badRequest, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';

const handleKnownError = (res: Response, error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message.includes('not found') || error.message.includes('access denied')) {
    notFoundMessage(res, error.message);
    return true;
  }

  if (error.message.includes('organization assignment')) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};

export const listSitesForConsole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
    const params: PublishedSiteSearchParams = {
      status: query.status as PublishedSiteSearchParams['status'],
      search: query.search as string | undefined,
      page: typeof query.page === 'number' ? query.page : undefined,
      limit: typeof query.limit === 'number' ? query.limit : undefined,
      sortBy: query.sortBy as PublishedSiteSearchParams['sortBy'],
      sortOrder: query.sortOrder as PublishedSiteSearchParams['sortOrder'],
    };

    const result = await publishingService.listSitesForConsole(
      req.user!.id,
      params,
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getSiteOverview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period =
      typeof (req.validatedQuery ?? req.query).period === 'number'
        ? ((req.validatedQuery ?? req.query).period as number)
        : 30;

    const result = await publishingService.getSiteOverview(
      req.params.siteId,
      req.user!.id,
      period,
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const getSiteForms = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publishingService.getSiteForms(
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

export const updateSiteForm = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updated = await publishingService.updateSiteForm(
      req.params.siteId,
      req.params.formKey,
      req.body as Partial<WebsiteFormOperationalConfig>,
      req.user!.id,
      req.organizationId
    );
    await siteCacheService.invalidateSite(req.params.siteId);

    sendSuccess(res, updated);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const getSiteIntegrations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await publishingService.getSiteIntegrationStatus(
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

export const updateSiteMailchimpIntegration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await websiteSiteSettingsService.updateMailchimpSettings(
      req.params.siteId,
      req.body as Partial<WebsiteMailchimpSettings>,
      req.user!.id,
      req.organizationId
    );
    await siteCacheService.invalidateSite(req.params.siteId);

    const result = await publishingService.getSiteIntegrationStatus(
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

export const updateSiteStripeIntegration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await websiteSiteSettingsService.updateStripeSettings(
      req.params.siteId,
      req.body as Partial<WebsiteStripeSettings>,
      req.user!.id,
      req.organizationId
    );
    await siteCacheService.invalidateSite(req.params.siteId);

    const result = await publishingService.getSiteIntegrationStatus(
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

export const updateSiteFacebookIntegration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await websiteSiteSettingsService.updateFacebookSettings(
      req.params.siteId,
      req.body as Partial<WebsiteFacebookSettings>,
      req.user!.id,
      req.organizationId
    );
    await siteCacheService.invalidateSite(req.params.siteId);

    const result = await publishingService.getSiteIntegrationStatus(
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

export const getSiteAnalyticsSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const period =
      typeof (req.validatedQuery ?? req.query).period === 'number'
        ? ((req.validatedQuery ?? req.query).period as number)
        : 30;

    const result = await publishingService.getConversionMetrics(
      req.params.siteId,
      req.user!.id,
      period,
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};

export const getSiteAnalyticsFunnel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const windowDays =
      typeof (req.validatedQuery ?? req.query).windowDays === 'number'
        ? ((req.validatedQuery ?? req.query).windowDays as number)
        : 30;

    const result = await publishingService.getConversionFunnel(
      req.params.siteId,
      req.user!.id,
      windowDays,
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownError(res, error)) return;
    next(error);
  }
};
