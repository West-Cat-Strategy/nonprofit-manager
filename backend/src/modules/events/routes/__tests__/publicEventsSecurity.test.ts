import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';

jest.mock('@middleware/domains/platform', () => ({
  publicEventCheckInLimiterMiddleware: (
    _req: Request,
    _res: Response,
    next: NextFunction
  ) => next(),
  publicEventRegistrationLimiterMiddleware: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (req.headers['x-block-public-event-registration'] === '1') {
      res.status(429).json({
        success: false,
        error: { code: 'rate_limit_exceeded', message: 'public-event-registration' },
      });
      return;
    }
    next();
  },
}));

jest.mock('@container/services', () => ({
  services: {
    event: {},
  },
}));

jest.mock('@services/publishing', () => ({
  __esModule: true,
  default: {
    getPublicSiteById: jest.fn(),
    getPublicSiteByIdForPreview: jest.fn(),
    getSiteBySubdomain: jest.fn(),
    getSiteBySubdomainForPreview: jest.fn(),
    getSiteByDomain: jest.fn(async () => ({
      id: 'site-1',
      userId: 'user-1',
      ownerUserId: 'user-1',
      organizationId: 'account-1',
      name: 'Site',
      subdomain: 'site',
      customDomain: null,
    })),
    getSiteByDomainForPreview: jest.fn(async () => ({
      id: 'site-1',
      userId: 'user-1',
      ownerUserId: 'user-1',
      organizationId: 'account-1',
      name: 'Site',
      subdomain: 'site',
      customDomain: null,
    })),
    recordAnalyticsEvent: jest.fn(),
  },
}));

jest.mock('../../repositories/eventRepository', () => ({
  EventRepository: jest.fn().mockImplementation(() => ({
    submitPublicRegistration: jest.fn(async () => ({
      created_registration: true,
      registration: { registration_id: 'registration-1' },
    })),
    listPublicEventsByOwner: jest.fn(),
    getPublicEventBySlug: jest.fn(),
  })),
}));

const buildApp = async () => {
  const { createPublicEventsV2Routes } = await import('../public');
  const app = express();
  app.use(express.json());
  app.use('/api/v2/public/events', createPublicEventsV2Routes());
  return app;
};

describe('public event registration security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const registrationPayload = {
    first_name: 'Pat',
    last_name: 'Volunteer',
    email: 'pat@example.org',
  };

  it('rejects staff-only registration controls on public registrations', async () => {
    await request(await buildApp())
      .post('/api/v2/public/events/11111111-1111-4111-8111-111111111111/registrations')
      .send({
        ...registrationPayload,
        registration_status: 'confirmed',
        enrollment_scope: 'series',
        send_confirmation_email: true,
      })
      .expect(400);
  });

  it('applies the public event registration limiter before validation and controller', async () => {
    await request(await buildApp())
      .post('/api/v2/public/events/11111111-1111-4111-8111-111111111111/registrations')
      .set('x-block-public-event-registration', '1')
      .send(registrationPayload)
      .expect(429)
      .expect(({ body }) => {
        expect(body.error.message).toBe('public-event-registration');
      });
  });
});
