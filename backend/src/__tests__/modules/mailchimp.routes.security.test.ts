import express from 'express';
import type { Response } from 'express';
import request from 'supertest';

const mailchimpControllerMocks = {
  getStatus: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getLists: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getList: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getListTags: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getSegments: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createSegment: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getMember: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  deleteMember: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  addMember: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  updateMemberTags: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  syncContact: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  bulkSyncContacts: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getSavedAudiences: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createSavedAudience: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  archiveSavedAudience: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getCampaigns: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  getCampaignRuns: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  sendCampaignRun: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  refreshCampaignRunStatus: jest.fn((_req: unknown, res: Response) =>
    res.status(200).json({ ok: true })
  ),
  cancelCampaignRun: jest.fn((_req: unknown, res: Response) =>
    res.status(405).json({
      success: false,
      error: { code: 'method_not_allowed', message: 'Not implemented' },
    })
  ),
  rescheduleCampaignRun: jest.fn((_req: unknown, res: Response) =>
    res.status(405).json({
      success: false,
      error: { code: 'method_not_allowed', message: 'Not implemented' },
    })
  ),
  previewCampaign: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createCampaign: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  sendDraftCampaignTest: jest.fn((_req: unknown, res: Response) =>
    res.status(200).json({ ok: true })
  ),
  sendCampaign: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  sendCampaignTest: jest.fn((_req: unknown, res: Response) =>
    res.status(200).json({ ok: true })
  ),
  handleWebhook: jest.fn((_req: unknown, res: Response) => res.status(200).json({ received: true })),
};

jest.mock('../../modules/mailchimp/controllers', () => mailchimpControllerMocks);
jest.mock('../../middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createMailchimpRoutes } from '../../modules/mailchimp/routes';

const originalMailchimpWebhookSecret = process.env.MAILCHIMP_WEBHOOK_SECRET;

const buildApp = (role?: string) => {
  const app = express();
  app.use(express.json());
  if (role) {
    app.use((req, _res, next) => {
      (req as any).user = { id: 'user-1', role };
      next();
    });
  }
  app.use('/api/v2/mailchimp', createMailchimpRoutes());
  return app;
};

const validCampaignPayload = () => ({
  listId: 'list-1',
  title: 'Spring Appeal',
  subject: 'Spring Appeal',
  fromName: 'Org',
  replyTo: 'hello@example.org',
});

describe('mailchimp routes authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MAILCHIMP_WEBHOOK_SECRET;
  });

  afterAll(() => {
    if (originalMailchimpWebhookSecret === undefined) {
      delete process.env.MAILCHIMP_WEBHOOK_SECRET;
    } else {
      process.env.MAILCHIMP_WEBHOOK_SECRET = originalMailchimpWebhookSecret;
    }
  });

  it('blocks admin mailchimp routes for non-admin roles', async () => {
    const app = buildApp('manager');

    await request(app).get('/api/v2/mailchimp/status').expect(403);

    expect(mailchimpControllerMocks.getStatus).not.toHaveBeenCalled();
  });

  it('allows admin mailchimp routes for admin roles', async () => {
    const app = buildApp('admin');

    await request(app).get('/api/v2/mailchimp/status').expect(200);

    expect(mailchimpControllerMocks.getStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps campaign preview behind the admin permission gate', async () => {
    const managerApp = buildApp('manager');

    await request(managerApp)
      .post('/api/v2/mailchimp/campaigns/preview')
      .send(validCampaignPayload())
      .expect(403);

    expect(mailchimpControllerMocks.previewCampaign).not.toHaveBeenCalled();

    const adminApp = buildApp('admin');

    await request(adminApp)
      .post('/api/v2/mailchimp/campaigns/preview')
      .send(validCampaignPayload())
      .expect(200);

    expect(mailchimpControllerMocks.previewCampaign).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported saved-audience filter shapes before the controller', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/audiences')
      .send({
        name: 'Unsafe Audience',
        filters: {
          source: 'freeform',
          contactIds: ['11111111-1111-4111-8111-111111111111'],
          listId: 'list-1',
        },
        sourceCount: 99,
      })
      .expect(400);

    expect(mailchimpControllerMocks.createSavedAudience).not.toHaveBeenCalled();
  });

  it('accepts selected-contact saved audiences without client-supplied source counts', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/audiences')
      .send({
        name: 'Selected Contacts',
        filters: {
          source: 'communications_selected_contacts',
          contactIds: ['11111111-1111-4111-8111-111111111111'],
          listId: 'list-1',
        },
      })
      .expect(200);

    expect(mailchimpControllerMocks.createSavedAudience).toHaveBeenCalledTimes(1);
  });

  it('rejects saved-audience archive requests without UUID audience IDs', async () => {
    const app = buildApp('admin');

    await request(app)
      .patch('/api/v2/mailchimp/audiences/not-a-uuid/archive')
      .send({})
      .expect(400);

    expect(mailchimpControllerMocks.archiveSavedAudience).not.toHaveBeenCalled();
  });

  it('rejects campaign creation fields outside the signed-out targeting contract', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/campaigns')
      .send({
        ...validCampaignPayload(),
        typedAppealId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(400);

    expect(mailchimpControllerMocks.createCampaign).not.toHaveBeenCalled();
  });

  it('accepts prior run suppression UUID arrays for campaign creation', async () => {
    const app = buildApp('admin');
    const priorRunSuppressionIds = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ];

    await request(app)
      .post('/api/v2/mailchimp/campaigns')
      .send({
        ...validCampaignPayload(),
        priorRunSuppressionIds,
      })
      .expect(200);

    expect(mailchimpControllerMocks.createCampaign).toHaveBeenCalledTimes(1);
    expect(
      (mailchimpControllerMocks.createCampaign.mock.calls[0]?.[0] as express.Request).body
        .priorRunSuppressionIds
    ).toEqual(priorRunSuppressionIds);
  });

  it('rejects invalid prior run suppression IDs for campaign creation before the controller', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/campaigns')
      .send({
        ...validCampaignPayload(),
        priorRunSuppressionIds: ['not-a-uuid'],
      })
      .expect(400);

    expect(mailchimpControllerMocks.createCampaign).not.toHaveBeenCalled();
  });

  it('accepts prior run suppression UUID arrays for campaign preview', async () => {
    const app = buildApp('admin');
    const priorRunSuppressionIds = ['11111111-1111-4111-8111-111111111111'];

    await request(app)
      .post('/api/v2/mailchimp/campaigns/preview')
      .send({
        ...validCampaignPayload(),
        priorRunSuppressionIds,
      })
      .expect(200);

    expect(mailchimpControllerMocks.previewCampaign).toHaveBeenCalledTimes(1);
    expect(
      (mailchimpControllerMocks.previewCampaign.mock.calls[0]?.[0] as express.Request).body
        .priorRunSuppressionIds
    ).toEqual(priorRunSuppressionIds);
  });

  it('rejects invalid prior run suppression IDs for campaign preview before the controller', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/campaigns/preview')
      .send({
        ...validCampaignPayload(),
        priorRunSuppressionIds: ['not-a-uuid'],
      })
      .expect(400);

    expect(mailchimpControllerMocks.previewCampaign).not.toHaveBeenCalled();
  });

  it('rejects campaign preview fields outside the signed-out targeting contract', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/campaigns/preview')
      .send({
        ...validCampaignPayload(),
        typedAppealId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(400);

    expect(mailchimpControllerMocks.previewCampaign).not.toHaveBeenCalled();
  });

  it('validates real campaign test-send recipients before the controller', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/campaigns/test-send')
      .send({
        ...validCampaignPayload(),
        testRecipients: ['proof@example.org'],
      })
      .expect(200);

    expect(mailchimpControllerMocks.sendDraftCampaignTest).toHaveBeenCalledTimes(1);

    await request(app)
      .post('/api/v2/mailchimp/campaigns/test-send')
      .send({
        ...validCampaignPayload(),
        testRecipients: ['not-an-email'],
      })
      .expect(400);

    expect(mailchimpControllerMocks.sendDraftCampaignTest).toHaveBeenCalledTimes(1);

    await request(app)
      .post('/api/v2/mailchimp/campaigns/campaign-123/test-send')
      .send({ testRecipients: ['proof@example.org'] })
      .expect(200);

    expect(mailchimpControllerMocks.sendCampaignTest).toHaveBeenCalledTimes(1);

    await request(app)
      .post('/api/v2/mailchimp/campaigns/campaign-123/test-send')
      .send({ testRecipients: ['not-an-email'] })
      .expect(400);

    expect(mailchimpControllerMocks.sendCampaignTest).toHaveBeenCalledTimes(1);
  });

  it('validates run-id campaign actions before the controller', async () => {
    const app = buildApp('admin');

    await request(app)
      .post('/api/v2/mailchimp/campaign-runs/not-a-uuid/send')
      .send({})
      .expect(400);

    expect(mailchimpControllerMocks.sendCampaignRun).not.toHaveBeenCalled();

    await request(app)
      .post('/api/v2/mailchimp/campaign-runs/not-a-uuid/cancel')
      .send({})
      .expect(400);

    expect(mailchimpControllerMocks.cancelCampaignRun).not.toHaveBeenCalled();

    await request(app)
      .post('/api/v2/mailchimp/campaign-runs/not-a-uuid/reschedule')
      .send({})
      .expect(400);

    expect(mailchimpControllerMocks.rescheduleCampaignRun).not.toHaveBeenCalled();

    await request(app)
      .post('/api/v2/mailchimp/campaign-runs/11111111-1111-4111-8111-111111111111/send')
      .send({})
      .expect(200);

    expect(mailchimpControllerMocks.sendCampaignRun).toHaveBeenCalledTimes(1);

    await request(app)
      .post('/api/v2/mailchimp/campaign-runs/11111111-1111-4111-8111-111111111111/cancel')
      .send({})
      .expect(405);

    expect(mailchimpControllerMocks.cancelCampaignRun).toHaveBeenCalledTimes(1);

    await request(app)
      .post('/api/v2/mailchimp/campaign-runs/11111111-1111-4111-8111-111111111111/reschedule')
      .send({})
      .expect(405);

    expect(mailchimpControllerMocks.rescheduleCampaignRun).toHaveBeenCalledTimes(1);
  });

  it('keeps the Mailchimp webhook public', async () => {
    const app = buildApp();

    await request(app).post('/api/v2/mailchimp/webhook').send({}).expect(200);

    expect(mailchimpControllerMocks.handleWebhook).toHaveBeenCalledTimes(1);
  });

  it('accepts the Mailchimp webhook query secret when configured', async () => {
    process.env.MAILCHIMP_WEBHOOK_SECRET = 'shared-webhook-secret';
    const app = buildApp();

    await request(app)
      .post('/api/v2/mailchimp/webhook?secret=shared-webhook-secret')
      .send({})
      .expect(200);

    expect(mailchimpControllerMocks.handleWebhook).toHaveBeenCalledTimes(1);
  });

  it('rejects missing or invalid Mailchimp webhook query secrets before the controller', async () => {
    process.env.MAILCHIMP_WEBHOOK_SECRET = 'shared-webhook-secret';
    const app = buildApp();

    await request(app).post('/api/v2/mailchimp/webhook').send({}).expect(401);
    await request(app)
      .post('/api/v2/mailchimp/webhook?secret=wrong-secret')
      .send({})
      .expect(401);

    expect(mailchimpControllerMocks.handleWebhook).not.toHaveBeenCalled();
  });
});
