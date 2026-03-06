import type { Response, NextFunction, Request } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, noContent, notFoundMessage } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import { websiteEntryService } from '@services/publishing/websiteEntryService';
import { publicWebsiteFormService } from '@services/publishing/publicWebsiteFormService';
import { publicSiteRuntimeService } from '@services/publishing/publicSiteRuntimeService';
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
    error.message.includes('Unsupported')
  ) {
    badRequest(res, error.message);
    return true;
  }

  return false;
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

    const result = await publicWebsiteFormService.submitForm(
      site,
      formKey,
      (req.body ?? {}) as Record<string, unknown>
    );
    sendSuccess(res, result, 201);
  } catch (error) {
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

    const pagePath = req.path || '/';
    const cacheKey = siteCacheService.generateCacheKey(
      site.id,
      pagePath,
      site.publishedVersion || 'v1'
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

    const html = await publicSiteRuntimeService.renderSitePage(site, pagePath);
    if (!html) {
      renderHtmlNotFound(res, site.name, pagePath);
      return;
    }

    const stored = await siteCacheService.set(cacheKey, html, site.publishedVersion || 'v1', {
      tags: [`site:${site.id}`],
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
