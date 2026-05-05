import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { cancelCampaignRun, createCampaign, rescheduleCampaignRun } from '../mailchimpController';

type MockMailchimpService = {
  isMailchimpConfigured: jest.Mock;
  createCampaign: jest.Mock;
};

jest.mock('../../services/mailchimpService', () => ({
  mailchimpService: {
    isMailchimpConfigured: jest.fn(),
    createCampaign: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockMailchimpService = jest.requireMock('../../services/mailchimpService')
  .mailchimpService as MockMailchimpService;

const createResponse = (): Response =>
  ({
    getHeader: jest.fn(),
    setHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response);

const createRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    body: {},
    ...overrides,
  } as AuthRequest);

describe('mailchimpController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMailchimpService.isMailchimpConfigured.mockReturnValue(true);
  });

  it('passes builder content through campaign creation', async () => {
    const builderContent = {
      accentColor: '#1d4ed8',
      footerText: 'Community Org',
      blocks: [
        { id: 'heading-1', type: 'heading', content: 'Spring Appeal', level: 1 },
        {
          id: 'paragraph-1',
          type: 'paragraph',
          content: 'Help fund our spring programs.',
        },
      ],
    };
    const campaign = {
      id: 'campaign-123',
      type: 'regular',
      status: 'save',
      title: 'Spring Appeal',
      subject: 'Spring Appeal',
      listId: 'list-123',
      createdAt: new Date('2026-05-01T10:00:00Z'),
    };
    mockMailchimpService.createCampaign.mockResolvedValueOnce(campaign);

    const res = createResponse();

    await createCampaign(
      createRequest({
        body: {
          listId: 'list-123',
          title: 'Spring Appeal',
          subject: 'Spring Appeal',
          previewText: 'Support our spring programs',
          fromName: 'Community Org',
          replyTo: 'hello@example.org',
          builderContent,
        },
      }),
      res
    );

    expect(mockMailchimpService.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: 'list-123',
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        previewText: 'Support our spring programs',
        fromName: 'Community Org',
        replyTo: 'hello@example.org',
        builderContent,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(campaign);
  });

  it('returns 405 for campaign-run cancellation without calling the service', async () => {
    const res = createResponse();

    await cancelCampaignRun(
      createRequest({
        params: { runId: '11111111-1111-4111-8111-111111111111' },
      }),
      res
    );

    expect(mockMailchimpService.createCampaign).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'method_not_allowed',
        message: 'Mailchimp campaign-run cancellation is not implemented by this backend contract.',
      },
    });
  });

  it('returns 405 for campaign-run rescheduling without calling the service', async () => {
    const res = createResponse();

    await rescheduleCampaignRun(
      createRequest({
        params: { runId: '11111111-1111-4111-8111-111111111111' },
      }),
      res
    );

    expect(mockMailchimpService.createCampaign).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'method_not_allowed',
        message: 'Mailchimp campaign-run rescheduling is not implemented by this backend contract.',
      },
    });
  });
});
