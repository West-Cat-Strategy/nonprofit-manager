import express from 'express';
import request from 'supertest';

const recurringDonationServiceMocks = {
  updatePlan: jest.fn(),
  cancelPlan: jest.fn(),
  reactivatePlan: jest.fn(),
};

jest.mock('../../modules/recurringDonations/services/recurringDonationService', () => ({
  recurringDonationService: {
    updatePlan: (...args: unknown[]) => recurringDonationServiceMocks.updatePlan(...args),
    cancelPlan: (...args: unknown[]) => recurringDonationServiceMocks.cancelPlan(...args),
    reactivatePlan: (...args: unknown[]) => recurringDonationServiceMocks.reactivatePlan(...args),
  },
}));

jest.mock('../../middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../middleware/requireActiveOrganizationContext', () => ({
  requireActiveOrganizationContext: (req: any, _res: unknown, next: () => void) => {
    req.organizationId = 'org-1';
    req.accountId = 'org-1';
    req.tenantId = 'org-1';
    next();
  },
}));

import { createRecurringDonationsRoutes } from '../../modules/recurringDonations/routes';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: 'user-1', role: 'admin' };
    next();
  });
  app.use('/api/v2/recurring-donations', createRecurringDonationsRoutes());
  return app;
};

describe('recurring donation non-Stripe management contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns client-safe 400 responses for non-Stripe amount changes', async () => {
    recurringDonationServiceMocks.updatePlan.mockRejectedValueOnce({
      statusCode: 400,
      message: 'Recurring donation amount changes are only supported for Stripe plans in this release',
    });

    const response = await request(buildApp())
      .put('/api/v2/recurring-donations/11111111-1111-4111-8111-111111111111')
      .send({ amount: 30 })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'bad_request',
        message: 'Recurring donation amount changes are only supported for Stripe plans in this release',
      },
    });
  });

  it('returns client-safe 400 responses for non-Stripe cancel and reactivate', async () => {
    recurringDonationServiceMocks.cancelPlan.mockRejectedValueOnce({
      statusCode: 400,
      message: 'Recurring donation cancellation is only supported for Stripe plans in this release',
    });
    recurringDonationServiceMocks.reactivatePlan.mockRejectedValueOnce({
      statusCode: 400,
      message: 'Recurring donation reactivation is only supported for Stripe plans in this release',
    });

    const cancelResponse = await request(buildApp())
      .post('/api/v2/recurring-donations/11111111-1111-4111-8111-111111111111/cancel')
      .send({})
      .expect(400);

    expect(cancelResponse.body).toMatchObject({
      success: false,
      error: {
        code: 'bad_request',
        message: 'Recurring donation cancellation is only supported for Stripe plans in this release',
      },
    });

    const reactivateResponse = await request(buildApp())
      .post('/api/v2/recurring-donations/11111111-1111-4111-8111-111111111111/reactivate')
      .send({})
      .expect(400);

    expect(reactivateResponse.body).toMatchObject({
      success: false,
      error: {
        code: 'bad_request',
        message: 'Recurring donation reactivation is only supported for Stripe plans in this release',
      },
    });
  });
});
