import express from 'express';
import request from 'supertest';
import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { createCommunicationsRoutes } from '../routes';
import * as communicationsService from '../services/communicationsService';

jest.mock('@middleware/domains/auth', () => ({
  authenticate: (req: AuthRequest, _res: Response, next: NextFunction) => {
    req.user = { id: 'user-1', role: 'admin' } as AuthRequest['user'];
    next();
  },
}));

jest.mock('../services/communicationsService', () => ({
  retryFailedCampaignRunRecipients: jest.fn(),
  cancelCampaignRun: jest.fn(),
  rescheduleCampaignRun: jest.fn(),
}));

const mockCommunicationsService = communicationsService as jest.Mocked<typeof communicationsService>;

const runId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const localRun = {
  id: runId,
  provider: 'local_email',
  providerCampaignId: null,
  title: 'Spring Update',
  listId: 'local_email:crm',
  includeAudienceId: null,
  exclusionAudienceIds: [],
  suppressionSnapshot: [],
  testRecipients: [],
  audienceSnapshot: {},
  contentSnapshot: {},
  requestedSendTime: null,
  status: 'sending',
  counts: {
    failedRecipientCount: 0,
    queuedRecipientCount: 2,
    failedRecipientRetryCount: 1,
  },
  scopeAccountIds: [],
  failureMessage: null,
  requestedBy: null,
  createdAt: new Date('2026-05-01T00:00:00Z'),
  updatedAt: new Date('2026-05-01T00:00:00Z'),
} as const;

const mailchimpRun = {
  ...localRun,
  provider: 'mailchimp',
  providerCampaignId: 'campaign-1',
} as const;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v2/communications', createCommunicationsRoutes());
  return app;
};

describe('communications routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes an operator-triggered failed-recipient retry action', async () => {
    mockCommunicationsService.retryFailedCampaignRunRecipients.mockResolvedValue({
      run: localRun,
      action: 'queued',
      message: 'Failed local recipients requeued; send the campaign run again to retry delivery',
    });

    const response = await request(buildApp())
      .post(`/api/v2/communications/campaign-runs/${runId}/retry-failed`)
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        action: 'queued',
        message: 'Failed local recipients requeued; send the campaign run again to retry delivery',
        run: {
          id: runId,
          provider: 'local_email',
          status: 'sending',
        },
      },
    });
    expect(mockCommunicationsService.retryFailedCampaignRunRecipients).toHaveBeenCalledWith(runId, []);
  });

  it('returns a 405-style error envelope for unsupported Mailchimp facade actions', async () => {
    mockCommunicationsService.cancelCampaignRun.mockResolvedValue({
      run: mailchimpRun,
      action: 'unsupported',
      message: 'Mailchimp campaign cancellation is not supported by the communications facade',
    });

    const response = await request(buildApp())
      .post(`/api/v2/communications/campaign-runs/${runId}/cancel`)
      .send({})
      .expect(405);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'method_not_allowed',
        message: 'Mailchimp campaign cancellation is not supported by the communications facade',
        details: {
          action: 'unsupported',
          provider: 'mailchimp',
          runId,
        },
      },
    });
    expect(mockCommunicationsService.cancelCampaignRun).toHaveBeenCalledWith(runId, []);
  });
});
