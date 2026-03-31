/**
 * Publishing Controller
 * HTTP handlers for website publishing operations
 */

import type { Request, Response, NextFunction } from 'express';
import publishingService from '@services/publishing';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import type {
  CreatePublishedSiteDTO,
  UpdatePublishedSiteDTO,
  PublishedSiteSearchParams,
  AnalyticsEventType,
  PublishTarget,
} from '@app-types/publishing';
import { badRequest, conflict, noContent, notFoundMessage } from '@utils/responseHelpers';
import { guardWithRole } from '@services/authGuardService';
import { extractPagination } from '@utils/queryHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { getCacheControlHeader, siteCacheService } from '@services/siteCacheService';

const parseIntQuery = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const resolvePublishedSiteFromRequest = async (req: Request) => {
  const subdomainParam = req.params.subdomain;
  const subdomain =
    req.subdomains[0] ||
    (Array.isArray(subdomainParam) ? subdomainParam[0] : subdomainParam);

  if (subdomain) {
    const siteBySubdomain = await publishingService.getSiteBySubdomain(subdomain);
    if (siteBySubdomain) return siteBySubdomain;
  }

  return publishingService.getSiteByDomain(req.hostname);
};

const handleKnownPublishingError = (
  error: unknown,
  res: Response,
  opts: { conflict?: boolean; notFound?: boolean; badRequest?: boolean }
): boolean => {
  if (!(error instanceof Error)) return false;

  if (opts.conflict && (error.message.includes('already taken') || error.message.includes('already in use'))) {
    conflict(res, error.message);
    return true;
  }
  if (opts.notFound && (error.message.includes('not found') || error.message.includes('access denied'))) {
    notFoundMessage(res, error.message);
    return true;
  }
  if (
    opts.badRequest &&
    (error.message.includes('No custom domain') ||
      error.message.includes('no published version') ||
      error.message.includes('Already on this version') ||
      error.message.includes('organization assignment'))
  ) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};

/**
 * Create a new published site entry
 */
export const createSite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const data: CreatePublishedSiteDTO = req.body;

    const site = await publishingService.createSite(userId, data, organizationId);
    sendSuccess(res, site, 201);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { conflict: true, notFound: true })) return;
    next(error);
  }
};

/**
 * Get a published site by ID
 */
export const getSite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const site = await publishingService.getSite(siteId, userId, organizationId);
    if (!site) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    sendSuccess(res, site);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a published site
 */
export const updateSite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;
    const data: UpdatePublishedSiteDTO = req.body;

    const site = await publishingService.updateSite(siteId, userId, data, organizationId);
    if (!site) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    sendSuccess(res, site);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { conflict: true, badRequest: true })) return;
    next(error);
  }
};

/**
 * Delete a published site
 */
export const deleteSite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const deleted = await publishingService.deleteSite(siteId, userId, organizationId);
    if (!deleted) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    noContent(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Search published sites
 */
export const searchSites = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const query = (req.validatedQuery ?? req.query) as Record<string, unknown>;
    const { page, limit } = extractPagination(query, { defaultLimit: 10 });
    const params: PublishedSiteSearchParams = {
      status: query.status as PublishedSiteSearchParams['status'],
      search: query.search as string,
      page,
      limit,
      sortBy: query.sortBy as PublishedSiteSearchParams['sortBy'],
      sortOrder: query.sortOrder as PublishedSiteSearchParams['sortOrder'],
    };

    const result = await publishingService.searchSites(userId, params, organizationId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Publish a template to create/update a site
 */
export const publishSite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { templateId } = req.body;
    const siteId = req.body.siteId as string | undefined;
    const target = (req.body.target as PublishTarget | undefined) || 'live';

    const result = await publishingService.publish(
      userId,
      templateId,
      siteId,
      organizationId,
      target
    );
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true, badRequest: true })) return;
    next(error);
  }
};

/**
 * Unpublish a site (set to draft)
 */
export const unpublishSite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const site = await publishingService.unpublish(siteId, userId, organizationId);
    if (!site) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    sendSuccess(res, site);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { badRequest: true })) return;
    next(error);
  }
};

/**
 * Get deployment info for a site
 */
export const getDeploymentInfo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const info = await publishingService.getDeploymentInfo(siteId, userId, organizationId);
    if (!info) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    sendSuccess(res, info);
  } catch (error) {
    next(error);
  }
};

/**
 * Record an analytics event (public endpoint for tracking)
 */
export const recordAnalytics = async (
  req: Request<{ siteId: string }>,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { siteId } = req.params;
    const eventType = req.body.eventType as AnalyticsEventType;

    // Extract user agent info from headers
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;

    await publishingService.recordAnalyticsEvent(siteId, eventType, {
      pagePath: req.body.pagePath,
      visitorId: req.body.visitorId,
      sessionId: req.body.sessionId,
      userAgent: userAgent as string,
      referrer: referrer as string,
      country: req.body.country,
      city: req.body.city,
      deviceType: req.body.deviceType,
      browser: req.body.browser,
      os: req.body.os,
      eventData: req.body.eventData,
    });

    // Return minimal response for analytics
    noContent(res);
  } catch (error) {
    // Don't fail silently for analytics but log
    logger.error('Analytics recording error', { error });
    noContent(res); // Still return success to not block client
  }
};

/**
 * Get analytics summary for a site
 */
export const getAnalyticsSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;
    const query = (req.validatedQuery ?? req.query) as {
      period?: number | string;
    };
    const periodDays = parseIntQuery(query.period, 30);

    const summary = await publishingService.getAnalyticsSummary(
      siteId,
      userId,
      periodDays,
      organizationId
    );
    sendSuccess(res, summary);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true })) return;
    next(error);
  }
};

/**
 * Serve published site content (for subdomain/domain routing)
 */
export const servePublishedSite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const site = await resolvePublishedSiteFromRequest(req);

    if (!site || site.status !== 'published' || !site.publishedContent) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    // Return published content
    sendSuccess(res, {
      content: site.publishedContent,
      analyticsEnabled: site.analyticsEnabled,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== Custom Domain Controllers ====================

/**
 * Add a custom domain to a site
 */
export const addCustomDomain = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;
    const { domain, verificationMethod } = req.body;

    const config = await publishingService.addCustomDomain(
      siteId,
      userId,
      domain,
      verificationMethod,
      organizationId
    );
    sendSuccess(res, config, 201);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true, conflict: true })) return;
    next(error);
  }
};

/**
 * Verify a custom domain's DNS configuration
 */
export const verifyCustomDomain = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const result = await publishingService.verifyCustomDomain(siteId, userId, organizationId);
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true, badRequest: true })) return;
    next(error);
  }
};

/**
 * Remove a custom domain from a site
 */
export const removeCustomDomain = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const removed = await publishingService.removeCustomDomain(siteId, userId, organizationId);
    if (!removed) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    noContent(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Get custom domain configuration
 */
export const getCustomDomainConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const config = await publishingService.getCustomDomainConfig(siteId, userId, organizationId);
    if (!config) {
      notFoundMessage(res, 'No custom domain configured');
      return;
    }

    sendSuccess(res, config);
  } catch (error) {
    next(error);
  }
};

// ==================== SSL Certificate Controllers ====================

/**
 * Get SSL certificate info for a site
 */
export const getSslInfo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const info = await publishingService.getSslInfo(siteId, userId, organizationId);
    if (!info) {
      notFoundMessage(res, 'Site not found or no domain configured');
      return;
    }

    sendSuccess(res, info);
  } catch (error) {
    next(error);
  }
};

/**
 * Provision SSL certificate for a site
 */
export const provisionSsl = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    const result = await publishingService.provisionSsl(siteId, userId, organizationId);
    if (!result.success) {
      badRequest(res, result.message);
      return;
    }

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// ==================== Version History Controllers ====================

/**
 * Get version history for a site
 */
export const getVersionHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;
    const query = (req.validatedQuery ?? req.query) as {
      limit?: number | string;
    };
    const limit = parseIntQuery(query.limit, 10);

    const history = await publishingService.getVersionHistory(siteId, userId, limit, organizationId);
    sendSuccess(res, history);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true })) return;
    next(error);
  }
};

/**
 * Get a specific version
 */
export const getVersion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId, version } = req.params;

    const versionData = await publishingService.getVersion(siteId, userId, version, organizationId);
    if (!versionData) {
      notFoundMessage(res, 'Version not found');
      return;
    }

    sendSuccess(res, versionData);
  } catch (error) {
    next(error);
  }
};

/**
 * Rollback to a previous version
 */
export const rollbackVersion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;
    const { version } = req.body;

    const result = await publishingService.rollback(siteId, userId, version, organizationId);
    sendSuccess(res, result);
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true, badRequest: true })) return;
    next(error);
  }
};

/**
 * Prune old versions
 */
export const pruneVersions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;
    const query = (req.validatedQuery ?? req.query) as {
      keep?: number | string;
    };
    const keepCount = parseIntQuery(query.keep, 10);

    const deletedCount = await publishingService.pruneVersions(siteId, userId, keepCount, organizationId);
    sendSuccess(res, { deleted: deletedCount });
  } catch (error) {
    if (handleKnownPublishingError(error, res, { notFound: true })) return;
    next(error);
  }
};

// ==================== Cache Management Controllers ====================

/**
 * Get cache statistics
 */
export const getCacheStats = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const stats = siteCacheService.getStats();
  sendSuccess(res, stats);
};

/**
 * Invalidate cache for a site
 */
export const invalidateSiteCache = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organizationId;
    const { siteId } = req.params;

    // Verify site ownership
    const site = await publishingService.getSite(siteId, userId, organizationId);
    if (!site) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    const invalidated = siteCacheService.invalidateSite(siteId);
    sendSuccess(res, { invalidated, siteId });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all cache (admin only)
 */
export const clearAllCache = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // Check for admin role
  if (!guardWithRole(req, res, 'admin')) return;

  await siteCacheService.clear();
  sendSuccess(res, { message: 'Cache cleared successfully' });
};

/**
 * Serve published site with caching
 */
export const servePublishedSiteWithCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const site = await resolvePublishedSiteFromRequest(req);
    const pageSlug = (req.params.page as string) || 'index';

    if (!site || site.status !== 'published' || !site.publishedContent) {
      notFoundMessage(res, 'Site not found');
      return;
    }

    // Check cache
    const cacheKey = siteCacheService.generateCacheKey(site.id, pageSlug);
    const cachedEntry = await siteCacheService.get(cacheKey);

    // Handle conditional GET
    const requestETag = req.headers['if-none-match'] as string;
    if (cachedEntry && siteCacheService.isNotModified(cachedEntry, requestETag)) {
      res.status(304).end();
      return;
    }

    // Set cache headers
    const cacheHeaders = siteCacheService.generateCacheHeaders(cachedEntry, {
      ttlSeconds: 300, // 5 minutes
    });

    for (const [header, value] of Object.entries(cacheHeaders)) {
      res.setHeader(header, value);
    }

    // If cache hit, return cached content
    if (cachedEntry) {
      sendSuccess(res, cachedEntry.data);
      return;
    }

    // Cache miss - get fresh content and cache it
    const content = {
      content: site.publishedContent,
      analyticsEnabled: site.analyticsEnabled,
    };

    // Store in cache
    await siteCacheService.set(cacheKey, content, site.publishedVersion || 'v1', {
      tags: [`site:${site.id}`],
    });

    sendSuccess(res, content);
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance info header helper
 */
export const getPerformanceCacheControl = (
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  sendSuccess(res, {
    profiles: {
      static: getCacheControlHeader('STATIC'),
      page: getCacheControlHeader('PAGE'),
      api: getCacheControlHeader('API'),
      dynamic: getCacheControlHeader('DYNAMIC'),
    },
  });
};
