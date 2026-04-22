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
  getCampaigns: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  previewCampaign: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  createCampaign: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  sendCampaign: jest.fn((_req: unknown, res: Response) => res.status(200).json({ ok: true })),
  handleWebhook: jest.fn((_req: unknown, res: Response) => res.status(200).json({ received: true })),
};

jest.mock('../../modules/mailchimp/controllers', () => mailchimpControllerMocks);
jest.mock('../../middleware/domains/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { createMailchimpRoutes } from '../../modules/mailchimp/routes';

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

describe('mailchimp routes authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      .send({
        listId: 'list-1',
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        fromName: 'Org',
        replyTo: 'hello@example.org',
      })
      .expect(403);

    expect(mailchimpControllerMocks.previewCampaign).not.toHaveBeenCalled();

    const adminApp = buildApp('admin');

    await request(adminApp)
      .post('/api/v2/mailchimp/campaigns/preview')
      .send({
        listId: 'list-1',
        title: 'Spring Appeal',
        subject: 'Spring Appeal',
        fromName: 'Org',
        replyTo: 'hello@example.org',
      })
      .expect(200);

    expect(mailchimpControllerMocks.previewCampaign).toHaveBeenCalledTimes(1);
  });

  it('keeps the Mailchimp webhook public', async () => {
    const app = buildApp();

    await request(app).post('/api/v2/mailchimp/webhook').send({}).expect(200);

    expect(mailchimpControllerMocks.handleWebhook).toHaveBeenCalledTimes(1);
  });
});
