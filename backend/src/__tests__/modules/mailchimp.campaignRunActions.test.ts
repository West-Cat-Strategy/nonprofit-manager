import express from 'express';
import request from 'supertest';

const mailchimpServiceMocks = {
  cancelCampaignRun: jest.fn(),
  rescheduleCampaignRun: jest.fn(),
};

jest.mock('../../modules/mailchimp/services/mailchimpService', () => ({
  UnsupportedMailchimpCampaignRunActionError: class UnsupportedMailchimpCampaignRunActionError extends Error {
    readonly statusCode = 405;
    readonly code = 'method_not_allowed';
  },
  mailchimpService: {
    cancelCampaignRun: (...args: unknown[]) => mailchimpServiceMocks.cancelCampaignRun(...args),
    rescheduleCampaignRun: (...args: unknown[]) =>
      mailchimpServiceMocks.rescheduleCampaignRun(...args),
  },
}));

jest.mock('../../middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createMailchimpRoutes } from '../../modules/mailchimp/routes';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: 'user-1', role: 'admin' };
    (req as any).accountId = 'org-1';
    next();
  });
  app.use('/api/v2/mailchimp', createMailchimpRoutes());
  return app;
};

describe('mailchimp campaign run unsupported provider actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for cancel instead of a successful unsupported action payload', async () => {
    mailchimpServiceMocks.cancelCampaignRun.mockRejectedValueOnce({
      statusCode: 405,
      code: 'method_not_allowed',
      message: 'Mailchimp campaign cancellation is not supported by this backend contract yet',
    });

    const response = await request(buildApp())
      .post('/api/v2/mailchimp/campaign-runs/11111111-1111-4111-8111-111111111111/cancel')
      .send({})
      .expect(405);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'method_not_allowed',
        message: 'Mailchimp campaign cancellation is not supported by this backend contract yet',
      },
    });
    expect(mailchimpServiceMocks.cancelCampaignRun).toHaveBeenCalledTimes(1);
  });

  it('returns 405 for reschedule instead of a successful unsupported action payload', async () => {
    mailchimpServiceMocks.rescheduleCampaignRun.mockRejectedValueOnce({
      statusCode: 405,
      code: 'method_not_allowed',
      message: 'Mailchimp campaign rescheduling is not supported by this backend contract yet',
    });

    const response = await request(buildApp())
      .post('/api/v2/mailchimp/campaign-runs/11111111-1111-4111-8111-111111111111/reschedule')
      .send({})
      .expect(405);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'method_not_allowed',
        message: 'Mailchimp campaign rescheduling is not supported by this backend contract yet',
      },
    });
    expect(mailchimpServiceMocks.rescheduleCampaignRun).toHaveBeenCalledTimes(1);
  });
});
