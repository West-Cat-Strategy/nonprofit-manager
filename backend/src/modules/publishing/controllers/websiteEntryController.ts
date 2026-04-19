import type { Response, NextFunction, Request } from 'express';
import { setRequestContext } from '@config/requestContext';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, noContent, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import publishingService from '@services/publishing';
import { websiteEntryService } from '@services/publishing/websiteEntryService';
import { publicWebsiteFormService } from '@services/publishing/publicWebsiteFormService';
import {
  PublicSubmissionConflictError,
  PublicSubmissionReplayError,
} from '@services/publishing/publicSubmissionService';
import { publicSiteRuntimeService } from '../services/publicSiteRuntimeService';
import { siteCacheService } from '@services/siteCacheService';
import { escapeHtml } from '@services/site-generator/escapeHtml';

const normalizeLimit = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const mapKnownError = (error: unknown, res: Response): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.message.includes('not found') ||
    error.message.includes('access denied')
  ) {
    notFoundMessage(res, error.message);
    return true;
  }

  if (
    error.message.includes('read-only') ||
    error.message.includes('organization assignment') ||
    error.message.includes('Only native') ||
    error.message.includes('Unsupported') ||
    error.message.includes('Idempotency-Key') ||
    error.message.includes('required') ||
    error.message.includes('configured')
  ) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};

const getRequestUserAgent = (req: Request): string | undefined => {
  const userAgent = req.headers['user-agent'];
  if (Array.isArray(userAgent)) {
    return userAgent[0] || undefined;
  }
  return userAgent || undefined;
};

const getRequestPagePath = (req: Request): string => {
  const referrer = req.headers.referer;
  if (typeof referrer === 'string' && referrer.trim().length > 0) {
    try {
      return new URL(referrer).pathname || '/';
    } catch {
      return '/';
    }
  }

  return '/';
};

const getRequestIpAddress = (req: Request): string | undefined => {
  if (typeof req.ip === 'string' && req.ip.trim().length > 0) {
    return req.ip;
  }
  return undefined;
};

const isPreviewRequest = (req: Request): boolean => {
  const preview = req.query.preview;
  if (typeof preview === 'boolean') {
    return preview;
  }

  if (typeof preview === 'string') {
    return preview === 'true' || preview === '1';
  }

  if (Array.isArray(preview)) {
    return preview.some((value) => value === 'true' || value === '1');
  }

  return false;
};

const getPreviewVersion = (req: Request): string | undefined => {
  const version = req.query.version;
  if (typeof version === 'string' && version.trim().length > 0) {
    return version.trim();
  }
  return undefined;
};

const renderHtmlNotFound = (res: Response, siteName: string, pagePath: string): void => {
  const safeSiteName = escapeHtml(siteName);
  const safePagePath = escapeHtml(pagePath);
  res
    .status(404)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Page not found</title>
    <style>
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f5ef;
        color: #163126;
      }
      main {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
      }
      article {
        max-width: 36rem;
        border: 1px solid #d7ddd8;
        border-radius: 24px;
        background: #ffffff;
        padding: 2rem;
        box-shadow: 0 18px 45px rgba(19, 49, 38, 0.08);
      }
      h1 {
        margin-top: 0;
      }
      p {
        line-height: 1.6;
        color: #486158;
      }
      code {
        padding: 0.1rem 0.35rem;
        border-radius: 6px;
        background: #eef2ef;
      }
    </style>
  </head>
  <body>
    <main>
      <article>
        <h1>Page not found</h1>
        <p>${safeSiteName} does not have a published page at <code>${safePagePath}</code>.</p>
      </article>
    </main>
  </body>
</html>`);
};

export const listWebsiteEntries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteId } = req.params;
    const query = (req.validatedQuery ?? req.query) as {
      status?: 'draft' | 'published' | 'archived';
      source?: 'native' | 'mailchimp';
    };

    const result = await websiteEntryService.listEntries(
      siteId,
      req.user!.id,
      {
        status: query.status,
        source: query.source,
      },
      req.organizationId
    );
    sendSuccess(res, result);
  } catch (error) {
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

export const getWebsiteEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteId, entryId } = req.params;
    const entry = await websiteEntryService.getEntry(
      siteId,
      entryId,
      req.user!.id,
      req.organizationId
    );

    if (!entry) {
      notFoundMessage(res, 'Website entry not found');
      return;
    }

    sendSuccess(res, entry);
  } catch (error) {
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

export const createWebsiteEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteId } = req.params;
    const entry = await websiteEntryService.createEntry(
      siteId,
      req.user!.id,
      req.body,
      req.organizationId
    );
    await siteCacheService.invalidateSite(siteId);
    sendSuccess(res, entry, 201);
  } catch (error) {
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

export const updateWebsiteEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteId, entryId } = req.params;
    const entry = await websiteEntryService.updateEntry(
      siteId,
      entryId,
      req.user!.id,
      req.body,
      req.organizationId
    );

    if (!entry) {
      notFoundMessage(res, 'Website entry not found');
      return;
    }

    await siteCacheService.invalidateSite(siteId);
    sendSuccess(res, entry);
  } catch (error) {
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

export const deleteWebsiteEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteId, entryId } = req.params;
    const deleted = await websiteEntryService.deleteEntry(
      siteId,
      entryId,
      req.user!.id,
      req.organizationId
    );

    if (!deleted) {
      notFoundMessage(res, 'Website entry not found');
      return;
    }

    await siteCacheService.invalidateSite(siteId);
    noContent(res);
  } catch (error) {
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

export const syncMailchimpEntries = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteId } = req.params;
    const listId =
      typeof req.body?.listId === 'string' && req.body.listId.trim().length > 0
        ? req.body.listId.trim()
        : undefined;
    const result = await websiteEntryService.syncMailchimpCampaigns(
      siteId,
      req.user!.id,
      listId,
      req.organizationId
    );
    await siteCacheService.invalidateSite(siteId);
    sendSuccess(res, result);
  } catch (error) {
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

const resolvePublishedSiteFromRequest = async (
  req: Request,
  explicitSiteKey?: string
) => {
  if (explicitSiteKey) {
    return publicWebsiteFormService.resolveSiteByKey(explicitSiteKey);
  }

  const subdomain = req.subdomains?.[0];
  if (subdomain) {
    const bySubdomain = await publicWebsiteFormService.resolveSiteByKey(subdomain);
    if (bySubdomain) {
      return bySubdomain;
    }
  }

  return publicWebsiteFormService.resolveSiteByKey(req.hostname);
};

export const listPublicNewsletters = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as {
      site?: string;
      limit?: number | string;
      offset?: number | string;
      source?: 'native' | 'mailchimp' | 'all';
    };

    const site = await resolvePublishedSiteFromRequest(req, query.site);
    if (!site) {
      notFoundMessage(res, 'Published site not found');
      return;
    }

    const result = await websiteEntryService.listPublicNewsletters(site, {
      limit: normalizeLimit(query.limit, 20),
      offset: normalizeLimit(query.offset, 0),
      sourceFilter: query.source || 'all',
    });

    sendSuccess(res, {
      ...result,
      site: {
        id: site.id,
        name: site.name,
        subdomain: site.subdomain,
        customDomain: site.customDomain,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicNewsletter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = (req.validatedQuery ?? req.query) as { site?: string };
    const params = (req.validatedParams ?? req.params) as { slug: string };
    const site = await resolvePublishedSiteFromRequest(req, query.site);
    if (!site) {
      notFoundMessage(res, 'Published site not found');
      return;
    }

    const entry = await websiteEntryService.getPublicNewsletterBySlug(site, params.slug);
    if (!entry) {
      notFoundMessage(res, 'Newsletter not found');
      return;
    }

    sendSuccess(res, {
      entry,
      site: {
        id: site.id,
        name: site.name,
        subdomain: site.subdomain,
        customDomain: site.customDomain,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submitPublicWebsiteForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { siteKey, formKey } = (req.validatedParams ?? req.params) as {
      siteKey: string;
      formKey: string;
    };
    const site = await publicWebsiteFormService.resolveSiteByKey(siteKey);
    if (!site) {
      notFoundMessage(res, 'Published site not found');
      return;
    }

    const actingUserId = site.ownerUserId || site.userId || undefined;
    const organizationId = site.organizationId || undefined;
    setRequestContext({
      userId: actingUserId,
      organizationId,
      accountId: organizationId,
      tenantId: organizationId,
    });

    const result = await publicWebsiteFormService.submitForm(
      site,
      formKey,
      (req.body ?? {}) as Record<string, unknown>,
      {
        idempotencyKey:
          typeof req.headers['idempotency-key'] === 'string'
            ? req.headers['idempotency-key']
            : undefined,
        ipAddress: getRequestIpAddress(req),
        userAgent: getRequestUserAgent(req),
        pagePath: getRequestPagePath(req),
        visitorId:
          typeof req.body?.visitorId === 'string' ? (req.body.visitorId as string) : undefined,
        sessionId:
          typeof req.body?.sessionId === 'string' ? (req.body.sessionId as string) : undefined,
        referrer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
      }
    );

    const isRecurringCheckoutPending =
      result.formType === 'donation-form' &&
      result.recurringPlanStatus === 'checkout_pending';

    if (!result.idempotentReplay && !isRecurringCheckoutPending) {
      await publishingService.recordAnalyticsEvent(
        site.id,
        result.formType === 'donation-form' ? 'donation' : 'form_submit',
        {
          pagePath: getRequestPagePath(req),
          visitorId:
            typeof req.body?.visitorId === 'string' ? (req.body.visitorId as string) : undefined,
          sessionId:
            typeof req.body?.sessionId === 'string' ? (req.body.sessionId as string) : undefined,
          userAgent: getRequestUserAgent(req),
          referrer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
          eventData: {
            formKey,
            formType: result.formType,
            sourceEntityType: result.recurringPlanId
              ? 'recurring_donation_plan'
              : result.donationId
                ? 'donation'
                : result.caseId
                  ? 'case'
                : result.contactId
                  ? 'contact'
                  : null,
            sourceEntityId:
              result.recurringPlanId || result.donationId || result.caseId || result.contactId || null,
          },
        }
      );
    }

    sendSuccess(res, result, result.idempotentReplay ? 200 : 201);
  } catch (error) {
    if (
      error instanceof PublicSubmissionConflictError ||
      error instanceof PublicSubmissionReplayError
    ) {
      badRequest(res, error.message);
      return;
    }
    if (mapKnownError(error, res)) return;
    next(error);
  }
};

export const renderPublishedWebsite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const site = await resolvePublishedSiteFromRequest(req);
    if (!site || !site.publishedContent) {
      next();
      return;
    }

    const previewVersion = isPreviewRequest(req) ? getPreviewVersion(req) || site.publishedVersion || undefined : undefined;
    let renderableSite = site;
    if (previewVersion) {
      const previewSnapshot = await publishingService.getPublicVersion(site.id, previewVersion);
      if (!previewSnapshot?.publishedContent) {
        notFoundMessage(res, 'Preview version not found');
        return;
      }
      renderableSite = {
        ...site,
        publishedContent: previewSnapshot.publishedContent,
        publishedVersion: previewSnapshot.version,
        publishedAt: previewSnapshot.publishedAt,
      };
    }

    const pagePath = req.path || '/';
    const cacheVariant = previewVersion ? `preview:${previewVersion}` : renderableSite.publishedVersion || 'v1';
    const cacheKey = siteCacheService.generateCacheKey(
      renderableSite.id,
      pagePath,
      cacheVariant
    );
    const cachedEntry = await siteCacheService.get<string>(cacheKey);
    const requestETag = req.headers['if-none-match'] as string | undefined;

    if (cachedEntry && siteCacheService.isNotModified(cachedEntry, requestETag)) {
      res.status(304).end();
      return;
    }

    const headers = siteCacheService.generateCacheHeaders(cachedEntry, {
      ttlSeconds: 300,
    });
    for (const [header, value] of Object.entries(headers)) {
      res.setHeader(header, value);
    }

    if (cachedEntry) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(cachedEntry.data);
      return;
    }

    const html = await publicSiteRuntimeService.renderSitePage(renderableSite, pagePath);
    if (!html) {
      renderHtmlNotFound(res, renderableSite.name, pagePath);
      return;
    }

    const stored = await siteCacheService.set(cacheKey, html, cacheVariant, {
      tags: [`site:${renderableSite.id}`],
      ttlSeconds: 300,
    });
    res.setHeader('ETag', stored.etag);
    res.setHeader('Last-Modified', new Date(stored.createdAt).toUTCString());
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    next(error);
  }
};
