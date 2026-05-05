import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import {
  publicPublishingV2Routes,
  publicWebsiteActionsV2Routes,
  publicWebsiteFormsV2Routes,
  publishingV2Routes,
} from '../index';

jest.mock('@middleware/domains/platform', () => ({
  publicNewsletterConfirmationLimiterMiddleware: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (req.headers['x-block-public-newsletter-confirmation'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-newsletter-confirmation' },
      });
      return;
    }
    next();
  },
  publicSiteAnalyticsLimiterMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-block-public-site-analytics'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-site-analytics' },
      });
      return;
    }
    next();
  },
  publicWebsiteActionLimiterMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-block-public-website-action'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-website-action' },
      });
      return;
    }
    next();
  },
  publicWebsiteFormLimiterMiddleware: (req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-block-public-website-form'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-website-form' },
      });
      return;
    }
    next();
  },
}));

jest.mock('@middleware/domains/auth', () => ({
  authenticate: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('@middleware/requireActiveOrganizationContext', () => ({
  requireActiveOrganizationContext: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../controllers', () => {
  const ok = (_req: Request, res: Response) => {
    res.status(204).end();
  };

  return {
    addCustomDomain: ok,
    clearAllCache: ok,
    confirmPublicNewsletterSignup: ok,
    createSite: ok,
    createSiteNewsletterListPreset: ok,
    createSitePublicAction: ok,
    createWebsiteEntry: ok,
    deleteSite: ok,
    deleteSiteNewsletterListPreset: ok,
    deleteWebsiteEntry: ok,
    exportSitePublicActionSubmissions: ok,
    getAnalyticsSummary: ok,
    getCacheStats: ok,
    getCustomDomainConfig: ok,
    getDeploymentInfo: ok,
    getPerformanceCacheControl: ok,
    getPublicContentEntry: ok,
    getPublicNewsletter: ok,
    getSite: ok,
    getSiteAnalyticsFunnel: ok,
    getSiteAnalyticsSummary: ok,
    getSiteForms: ok,
    getSiteIntegrations: ok,
    getSiteNewsletterWorkspace: ok,
    getSiteOverview: ok,
    getSitePublicActionSupportLetterArtifact: ok,
    getSslInfo: ok,
    getVersion: ok,
    getVersionHistory: ok,
    getWebsiteEntry: ok,
    invalidateSiteCache: ok,
    listPublicContentEntries: ok,
    listPublicNewsletters: ok,
    listSitePublicActionSubmissions: ok,
    listSitePublicActions: ok,
    listSitesForConsole: ok,
    listWebsiteEntries: ok,
    publishSite: ok,
    provisionSsl: ok,
    pruneVersions: ok,
    recordAnalytics: ok,
    refreshSiteNewsletterWorkspace: ok,
    removeCustomDomain: ok,
    rollbackVersion: ok,
    servePublishedSite: ok,
    submitPublicAction: ok,
    submitPublicWebsiteForm: ok,
    syncMailchimpEntries: ok,
    unpublishSite: ok,
    updateSite: ok,
    updateSiteFacebookIntegration: ok,
    updateSiteForm: ok,
    updateSiteMailchimpIntegration: ok,
    updateSiteNewsletterListPreset: ok,
    updateSiteNewsletterWorkspace: ok,
    updateSitePublicAction: ok,
    updateSiteStripeIntegration: ok,
    updateWebsiteEntry: ok,
    verifyCustomDomain: ok,
  };
});

describe('public publishing route rate limits', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/public/newsletters', publicPublishingV2Routes);
  app.use('/api/v2/public/forms', publicWebsiteFormsV2Routes);
  app.use('/api/v2/public/actions', publicWebsiteActionsV2Routes);
  app.use('/api/v2/sites', publishingV2Routes);

  it('applies the public website form limiter before form submissions', async () => {
    await request(app)
      .post('/api/v2/public/forms/site-1/contact/submit')
      .set('x-block-public-website-form', '1')
      .send({ email: 'person@example.com' })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-website-form');
      });
  });

  it('applies the public website action limiter before action submissions', async () => {
    await request(app)
      .post('/api/v2/public/actions/site-1/save-the-library/submissions')
      .set('x-block-public-website-action', '1')
      .send({ email: 'person@example.com' })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-website-action');
      });
  });

  it('applies the newsletter confirmation limiter before GET and POST confirmation writes', async () => {
    await request(app)
      .get('/api/v2/public/newsletters/confirm/signed-token')
      .set('x-block-public-newsletter-confirmation', '1')
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-newsletter-confirmation');
      });

    await request(app)
      .post('/api/v2/public/newsletters/confirm/signed-token')
      .set('x-block-public-newsletter-confirmation', '1')
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-newsletter-confirmation');
      });
  });

  it('applies the public site analytics limiter before tracking writes', async () => {
    await request(app)
      .post('/api/v2/sites/11111111-1111-4111-8111-111111111111/track')
      .set('x-block-public-site-analytics', '1')
      .send({
        eventType: 'pageview',
        pagePath: '/',
      })
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-site-analytics');
      });
  });
});
