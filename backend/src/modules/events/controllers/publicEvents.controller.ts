import { NextFunction, Request, Response } from 'express';
import type {
  PublicEventCheckInDTO,
  PublicEventRegistrationDTO,
  PublicEventsQuery,
} from '@app-types/event';
import type { PublishedSite } from '@app-types/publishing';
import { logger } from '@config/logger';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { EventCatalogUseCase } from '../usecases/eventCatalog.usecase';
import { EventRegistrationUseCase } from '../usecases/registration.usecase';

interface PublicSiteResolverPort {
  getPublicSiteById(siteId: string): Promise<PublishedSite | null>;
  getSiteBySubdomain(subdomain: string): Promise<PublishedSite | null>;
  getSiteByDomain(domain: string): Promise<PublishedSite | null>;
  recordAnalyticsEvent(
    siteId: string,
    eventType: 'event_register',
    data: {
      pagePath: string;
      visitorId?: string;
      sessionId?: string;
      userAgent?: string;
      referrer?: string;
      eventData?: Record<string, unknown>;
    }
  ): Promise<unknown>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PublicEventsControllerDeps {
  catalogUseCase: EventCatalogUseCase;
  registrationUseCase: EventRegistrationUseCase;
  siteResolver: PublicSiteResolverPort;
}

const getValidatedParams = (req: Request): Record<string, string> =>
  ((req as Request & { validatedParams?: Record<string, string> }).validatedParams ??
    req.params) as Record<string, string>;

const getValidatedQuery = (req: Request): Record<string, unknown> =>
  ((req as Request & { validatedQuery?: Record<string, unknown> }).validatedQuery ??
    req.query) as Record<string, unknown>;

const normalizeQuery = (req: Request): PublicEventsQuery => {
  const query = getValidatedQuery(req);

  return {
    search: typeof query.search === 'string' ? query.search : undefined,
    event_type:
      typeof query.event_type === 'string'
        ? (query.event_type as PublicEventsQuery['event_type'])
        : undefined,
    include_past: typeof query.include_past === 'boolean' ? query.include_past : undefined,
    limit: typeof query.limit === 'number' ? query.limit : undefined,
    offset: typeof query.offset === 'number' ? query.offset : undefined,
    sort_by:
      typeof query.sort_by === 'string'
        ? (query.sort_by as PublicEventsQuery['sort_by'])
        : undefined,
    sort_order:
      typeof query.sort_order === 'string'
        ? (query.sort_order as PublicEventsQuery['sort_order'])
        : undefined,
    site: typeof query.site === 'string' ? query.site : undefined,
  };
};

const mapCheckInError = (res: Response, error: Error): boolean => {
  if (
    error.message === 'Event not found' ||
    error.message === 'Public check-in is not enabled for this event'
  ) {
    sendError(res, 'EVENT_NOT_FOUND', 'Event check-in is unavailable', 404);
    return true;
  }

  if (error.message === 'Invalid event check-in PIN') {
    sendError(res, 'INVALID_PIN', error.message, 403);
    return true;
  }

  if (error.message === 'Event check-in PIN is not configured') {
    sendError(res, 'PIN_NOT_CONFIGURED', error.message, 400);
    return true;
  }

  if (error.message === 'Event is at full capacity') {
    sendError(res, 'EVENT_FULL', error.message, 400);
    return true;
  }

  if (
    error.message === 'Event is not accepting check-ins' ||
    error.message.includes('Check-in is available')
  ) {
    sendError(res, 'CHECKIN_CLOSED', error.message, 400);
    return true;
  }

  return false;
};

const mapRegistrationError = (res: Response, error: Error): boolean => {
  if (error.message === 'Event not found') {
    sendError(res, 'EVENT_NOT_FOUND', 'Event is unavailable', 404);
    return true;
  }

  if (error.message === 'Event registration is unavailable') {
    sendError(res, 'REGISTRATION_CLOSED', error.message, 400);
    return true;
  }

  if (error.message === 'Event is at full capacity') {
    sendError(res, 'EVENT_FULL', error.message, 400);
    return true;
  }

  return false;
};

const resolveSiteByKey = async (
  siteKey: string,
  siteResolver: PublicSiteResolverPort
): Promise<PublishedSite | null> => {
  const normalized = siteKey.trim().toLowerCase();
  if (UUID_PATTERN.test(normalized)) {
    const siteById = await siteResolver.getPublicSiteById(normalized);
    if (siteById) {
      return siteById;
    }
  }

  const siteBySubdomain = await siteResolver.getSiteBySubdomain(normalized);
  if (siteBySubdomain) {
    return siteBySubdomain;
  }

  return siteResolver.getSiteByDomain(normalized);
};

const resolveSiteFromRequest = async (
  req: Request,
  siteQuery: string | undefined,
  siteResolver: PublicSiteResolverPort
): Promise<PublishedSite | null> => {
  if (siteQuery) {
    return resolveSiteByKey(siteQuery, siteResolver);
  }

  const subdomain = req.subdomains?.[0];
  if (subdomain) {
    const siteBySubdomain = await siteResolver.getSiteBySubdomain(subdomain.toLowerCase());
    if (siteBySubdomain) {
      return siteBySubdomain;
    }
  }

  return siteResolver.getSiteByDomain(req.hostname.toLowerCase());
};

const isPublishedSite = (site: PublishedSite | null): site is PublishedSite =>
  Boolean(site && site.status === 'published');

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

const toSiteSummary = (site: PublishedSite) => ({
  id: site.id,
  name: site.name,
  subdomain: site.subdomain,
  customDomain: site.customDomain,
});

export const createPublicEventsController = ({
  catalogUseCase,
  registrationUseCase,
  siteResolver,
}: PublicEventsControllerDeps) => {
  const listPublicEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startedAt = Date.now();
    try {
      const query = normalizeQuery(req);
      const site = await resolveSiteFromRequest(req, query.site, siteResolver);

      if (!isPublishedSite(site)) {
        logger.info('Public events catalog request', {
          route: '/api/v2/public/events',
          resolver: query.site ? 'query' : 'host',
          status: 404,
          durationMs: Date.now() - startedAt,
        });
        sendError(res, 'SITE_NOT_FOUND', 'Published site not found', 404);
        return;
      }

      const data = await catalogUseCase.listPublicByOwner(site.ownerUserId || site.userId, query);
      logger.info('Public events catalog request', {
        route: '/api/v2/public/events',
        siteId: site.id,
        status: 200,
        durationMs: Date.now() - startedAt,
      });
      sendSuccess(res, { ...data, site: toSiteSummary(site) });
    } catch (error) {
      next(error);
    }
  };

  const listPublicEventsBySiteKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startedAt = Date.now();
    try {
      const params = getValidatedParams(req);
      const query = normalizeQuery(req);
      const site = await resolveSiteByKey(params.siteKey, siteResolver);

      if (!isPublishedSite(site)) {
        logger.info('Public events catalog request', {
          route: '/api/v2/public/events/sites/:siteKey',
          siteKey: params.siteKey,
          status: 404,
          durationMs: Date.now() - startedAt,
        });
        sendError(res, 'SITE_NOT_FOUND', 'Published site not found', 404);
        return;
      }

      const data = await catalogUseCase.listPublicByOwner(site.ownerUserId || site.userId, query);
      logger.info('Public events catalog request', {
        route: '/api/v2/public/events/sites/:siteKey',
        siteId: site.id,
        siteKey: params.siteKey,
        status: 200,
        durationMs: Date.now() - startedAt,
      });
      sendSuccess(res, { ...data, site: toSiteSummary(site) });
    } catch (error) {
      next(error);
    }
  };

  const getCheckInInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = getValidatedParams(req);
      const info = await registrationUseCase.getPublicCheckInInfo(params.id);
      if (!info) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event check-in is unavailable', 404);
        return;
      }

      sendSuccess(res, info);
    } catch (error) {
      next(error);
    }
  };

  const submitCheckIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const params = getValidatedParams(req);
      const result = await registrationUseCase.submitPublicCheckIn(
        params.id,
        req.body as PublicEventCheckInDTO
      );
      sendSuccess(res, result, result.created_registration ? 201 : 200);
    } catch (error) {
      if (error instanceof Error && mapCheckInError(res, error)) {
        return;
      }
      next(error);
    }
  };

  const getPublicEventBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const params = getValidatedParams(req);
      const query = normalizeQuery(req);
      const site = await resolveSiteFromRequest(req, query.site, siteResolver);

      if (!isPublishedSite(site)) {
        sendError(res, 'SITE_NOT_FOUND', 'Published site not found', 404);
        return;
      }

      const event = await catalogUseCase.getPublicBySlug(site.ownerUserId || site.userId, params.slug);
      if (!event) {
        sendError(res, 'EVENT_NOT_FOUND', 'Event is unavailable', 404);
        return;
      }

      sendSuccess(res, { event, site: toSiteSummary(site) });
    } catch (error) {
      next(error);
    }
  };

  const submitRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const params = getValidatedParams(req);
      const query = normalizeQuery(req);
      const result = await registrationUseCase.submitPublicRegistration(
        params.id,
        req.body as PublicEventRegistrationDTO
      );

      const site = await resolveSiteFromRequest(req, query.site, siteResolver);
      if (isPublishedSite(site)) {
        await siteResolver.recordAnalyticsEvent(site.id, 'event_register', {
          pagePath: getRequestPagePath(req),
          visitorId:
            typeof req.body?.visitorId === 'string' ? (req.body.visitorId as string) : undefined,
          sessionId:
            typeof req.body?.sessionId === 'string' ? (req.body.sessionId as string) : undefined,
          userAgent: getRequestUserAgent(req),
          referrer: typeof req.headers.referer === 'string' ? req.headers.referer : undefined,
          eventData: {
            eventId: params.id,
            registrationId: result.registration?.registration_id ?? null,
          },
        });
      }

      sendSuccess(res, result, result.created_registration ? 201 : 200);
    } catch (error) {
      if (error instanceof Error && mapRegistrationError(res, error)) {
        return;
      }
      next(error);
    }
  };

  return {
    listPublicEvents,
    listPublicEventsBySiteKey,
    getPublicEventBySlug,
    submitRegistration,
    getCheckInInfo,
    submitCheckIn,
  };
};
