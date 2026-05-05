jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/emailSettingsService', () => ({
  getEmailSettings: jest.fn(),
}));

jest.mock('@services/emailService', () => ({
  sendMail: jest.fn(),
}));

jest.mock('@services/mailchimpService', () => ({
  __esModule: true,
  default: {
    getStatus: jest.fn(),
    getCampaigns: jest.fn(),
    createCampaign: jest.fn(),
    sendCampaignRun: jest.fn(),
    refreshCampaignRunStatus: jest.fn(),
    sendDraftCampaignTest: jest.fn(),
  },
}));

jest.mock('../services/unsubscribeService', () => ({
  hashUnsubscribeEmail: jest.fn((email: string) => `hash:${email.trim().toLowerCase()}`),
}));

jest.mock('../services/unsubscribeTokenService', () => ({
  createLocalUnsubscribeToken: jest.fn(({ recipientId }: { recipientId: string }) => `token:${recipientId}`),
}));

jest.mock('../services/browserViewTokenService', () => ({
  createLocalCampaignBrowserViewToken: jest.fn(
    ({ runId }: { runId: string }) => `view-token:${runId}`
  ),
}));

import pool from '@config/database';
import { sendMail } from '@services/emailService';
import mailchimpService from '@services/mailchimpService';
import * as communicationsService from '../services/communicationsService';
import { drainDueLocalCampaignRuns } from '../services/localCampaignDrainService';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockSendMail = sendMail as jest.Mock;
const mockMailchimpService = mailchimpService as jest.Mocked<typeof mailchimpService>;
const originalApiOrigin = process.env.API_ORIGIN;
const originalSiteBaseUrl = process.env.SITE_BASE_URL;
const originalFrontendUrl = process.env.FRONTEND_URL;

const contactIds = {
  deliverable: '11111111-1111-4111-8111-111111111111',
  doNotEmail: '22222222-2222-4222-8222-222222222222',
  suppressed: '33333333-3333-4333-8333-333333333333',
  missingEmail: '44444444-4444-4444-8444-444444444444',
};
const selectedContactIds = [
  contactIds.deliverable,
  contactIds.doNotEmail,
  contactIds.suppressed,
  contactIds.missingEmail,
];

const baseRunRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  provider: 'local_email',
  provider_campaign_id: null,
  title: 'Spring Update',
  list_id: null,
  include_audience_id: null,
  exclusion_audience_ids: [],
  suppression_snapshot: [],
  test_recipients: [],
  audience_snapshot: { targetContactIds: [contactIds.deliverable] },
  content_snapshot: {
    subject: 'Spring Update',
    html: '<p>Hello</p>',
    plainText: 'Hello',
  },
  requested_send_time: null,
  status: 'draft',
  counts: {},
  scope_account_ids: [],
  failure_message: null,
  requested_by: null,
  created_at: new Date('2026-05-01T00:00:00Z'),
  updated_at: new Date('2026-05-01T00:00:00Z'),
};

const mockContacts = [
  {
    id: contactIds.deliverable,
    account_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ADA@example.org',
    do_not_email: false,
    suppressed: false,
  },
  {
    id: contactIds.doNotEmail,
    account_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    first_name: 'Grace',
    last_name: 'Hopper',
    email: 'grace@example.org',
    do_not_email: true,
    suppressed: false,
  },
  {
    id: contactIds.suppressed,
    account_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    first_name: 'Katherine',
    last_name: 'Johnson',
    email: 'katherine@example.org',
    do_not_email: false,
    suppressed: true,
  },
  {
    id: contactIds.missingEmail,
    account_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    first_name: 'Mary',
    last_name: 'Jackson',
    email: null,
    do_not_email: false,
    suppressed: false,
  },
];

const mockPoolBySql = (): void => {
  mockPool.query.mockImplementation((query: unknown) => {
    const sql = String(query);
    if (sql.includes("to_regclass('public.contact_suppression_evidence')")) {
      return Promise.resolve({ rows: [{ exists: true }], rowCount: 1 });
    }
    if (sql.includes('FROM contacts c')) {
      return Promise.resolve({ rows: mockContacts, rowCount: mockContacts.length });
    }
    if (sql.includes('INSERT INTO campaign_runs')) {
      return Promise.resolve({ rows: [baseRunRow], rowCount: 1 });
    }
    if (sql.includes('INSERT INTO campaign_run_recipients')) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes('UPDATE campaign_runs')) {
      return Promise.resolve({
        rows: [
          {
            ...baseRunRow,
            counts: {
              queuedRecipientCount: 1,
              suppressedRecipientCount: 1,
              doNotEmailCount: 1,
              missingEmailCount: 1,
            },
          },
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
};

describe('communicationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_ORIGIN = 'https://api.example.org';
    process.env.SITE_BASE_URL = 'https://site.example.org';
    process.env.FRONTEND_URL = 'https://frontend.example.org';
  });

  afterAll(() => {
    if (originalApiOrigin === undefined) {
      delete process.env.API_ORIGIN;
    } else {
      process.env.API_ORIGIN = originalApiOrigin;
    }
    if (originalSiteBaseUrl === undefined) {
      delete process.env.SITE_BASE_URL;
    } else {
      process.env.SITE_BASE_URL = originalSiteBaseUrl;
    }
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
  });

  it('previews a local audience while applying do-not-email and active suppression evidence', async () => {
    mockPoolBySql();

    const preview = await communicationsService.previewAudience({
      contactIds: selectedContactIds,
    });

    expect(preview).toEqual({
      requestedContactCount: 4,
      eligibleContactCount: 1,
      missingEmailCount: 1,
      doNotEmailCount: 1,
      suppressedCount: 1,
      targetContactIds: [contactIds.deliverable],
      suppressedContactIds: [contactIds.doNotEmail, contactIds.suppressed],
    });
  });

  it('creates a local campaign run and queues recipient rows', async () => {
    mockPoolBySql();

    const run = await communicationsService.createCampaign({
      provider: 'local_email',
      title: 'Spring Update',
      subject: 'Spring Update',
      fromName: 'Team',
      replyTo: 'team@example.org',
      plainTextContent: 'Hello supporters',
      contactIds: selectedContactIds,
    });

    expect(run.provider).toBe('local_email');
    expect(run.campaignRunId).toBe(baseRunRow.id);
    expect(run.listId).toBe('local_email:crm');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO campaign_runs'),
      expect.arrayContaining(['Spring Update'])
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO campaign_run_recipients'),
      expect.arrayContaining([baseRunRow.id, contactIds.deliverable, 'ada@example.org', 'queued', null])
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO campaign_run_recipients'),
      expect.arrayContaining([
        baseRunRow.id,
        contactIds.doNotEmail,
        'grace@example.org',
        'suppressed',
        'Contact has do_not_email flag set',
      ])
    );
  });

  it('creates a local campaign for the default CRM audience without explicit contact IDs', async () => {
    mockPoolBySql();

    const campaign = await communicationsService.createCampaign({
      provider: 'local_email',
      listId: 'local_email:crm',
      title: 'All Contacts Update',
      subject: 'All Contacts Update',
      fromName: 'Team',
      replyTo: 'team@example.org',
      plainTextContent: 'Hello supporters',
    });

    expect(campaign).toEqual(
      expect.objectContaining({
        provider: 'local_email',
        campaignRunId: baseRunRow.id,
        id: baseRunRow.id,
        status: 'draft',
        title: 'Spring Update',
      })
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT c.id'),
      expect.any(Array)
    );
  });

  it('lists local campaign runs as campaign summaries for the communications campaign list', async () => {
    mockMailchimpService.getCampaigns.mockResolvedValue([]);
    mockPool.query.mockResolvedValue({
      rows: [
        {
          ...baseRunRow,
          list_id: 'local_email:crm',
          counts: { sentRecipientCount: 3 },
        },
      ],
      rowCount: 1,
    });

    const campaigns = await communicationsService.listCampaigns('local_email:crm');

    expect(campaigns).toEqual([
      expect.objectContaining({
        id: baseRunRow.id,
        campaignRunId: baseRunRow.id,
        provider: 'local_email',
        listId: 'local_email:crm',
        subject: 'Spring Update',
        emailsSent: 3,
      }),
    ]);
    expect(mockMailchimpService.getCampaigns).not.toHaveBeenCalled();
  });

  it('sends a local campaign run through the SMTP email service in a small batch', async () => {
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({ rows: [baseRunRow], rowCount: 1 });
      }
      if (sql.includes('UPDATE campaign_run_recipients') && sql.includes("SET status = 'sending'")) {
        return Promise.resolve({
          rows: [
            { id: 'recipient-1', email: 'ada@example.org' },
            { id: 'recipient-2', email: 'grace@example.org' },
          ],
          rowCount: 2,
        });
      }
      if (sql.includes('SELECT COUNT(*)::text AS count')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 });
      }
      if (sql.includes('UPDATE campaign_runs')) {
        return Promise.resolve({ rows: [{ ...baseRunRow, status: 'sent' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });
    mockSendMail.mockResolvedValue(true);

    const result = await communicationsService.sendCampaignRun(baseRunRow.id);

    expect(result?.action).toBe('sent');
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(mockSendMail.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining(
          'View this email in your browser: https://api.example.org/api/v2/public/communications/view/view-token%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        ),
        html: expect.stringContaining(
          'href="https://api.example.org/api/v2/public/communications/view/view-token%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"'
        ),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.org',
        subject: 'Spring Update',
        text: expect.stringContaining(
          'Unsubscribe: https://api.example.org/api/v2/public/communications/unsubscribe/token%3Arecipient-1'
        ),
        html: expect.stringContaining(
          'href="https://api.example.org/api/v2/public/communications/unsubscribe/token%3Arecipient-1"'
        ),
        headers: {
          'List-Unsubscribe':
            '<https://api.example.org/api/v2/public/communications/unsubscribe/token%3Arecipient-1>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
    );
  });

  it('continues sending a local campaign run that is already in sending status', async () => {
    delete process.env.API_ORIGIN;
    process.env.SITE_BASE_URL = 'https://site.example.org';
    process.env.FRONTEND_URL = 'https://frontend.example.org';
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [{ ...baseRunRow, status: 'sending' }],
          rowCount: 1,
        });
      }
      if (sql.includes('UPDATE campaign_run_recipients') && sql.includes("SET status = 'sending'")) {
        return Promise.resolve({
          rows: [{ id: 'recipient-1', email: 'ada@example.org' }],
          rowCount: 1,
        });
      }
      if (sql.includes('SELECT COUNT(*)::text AS count')) {
        return Promise.resolve({ rows: [{ count: '1' }], rowCount: 1 });
      }
      if (sql.includes('UPDATE campaign_runs')) {
        return Promise.resolve({
          rows: [{ ...baseRunRow, status: 'sending' }],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });
    mockSendMail.mockResolvedValue(true);

    const result = await communicationsService.sendCampaignRun(baseRunRow.id);

    expect(result?.action).toBe('queued');
    expect(result?.run.status).toBe('sending');
    expect(mockSendMail.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining(
          'View this email in your browser: http://localhost:3000/api/v2/public/communications/view/view-token%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        ),
        html: expect.stringContaining(
          'href="http://localhost:3000/api/v2/public/communications/view/view-token%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"'
        ),
      })
    );
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.org',
        subject: 'Spring Update',
        text: expect.stringContaining(
          'Unsubscribe: http://localhost:3000/api/v2/public/communications/unsubscribe/token%3Arecipient-1'
        ),
        html: expect.stringContaining(
          'href="http://localhost:3000/api/v2/public/communications/unsubscribe/token%3Arecipient-1"'
        ),
        headers: {
          'List-Unsubscribe':
            '<http://localhost:3000/api/v2/public/communications/unsubscribe/token%3Arecipient-1>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
    );
  });

  it('keeps a local campaign run failed when no queued recipients remain but failures exist', async () => {
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [{ ...baseRunRow, status: 'sending' }],
          rowCount: 1,
        });
      }
      if (sql.includes('UPDATE campaign_run_recipients') && sql.includes("SET status = 'sending'")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes('GROUP BY status')) {
        return Promise.resolve({
          rows: [
            { status: 'failed', count: '1' },
            { status: 'sent', count: '2' },
          ],
          rowCount: 2,
        });
      }
      if (sql.includes('UPDATE campaign_runs')) {
        return Promise.resolve({
          rows: [
            {
              ...baseRunRow,
              status: 'failed',
              counts: { failedRecipientCount: 1 },
              failure_message: 'One or more local email recipients failed',
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await communicationsService.sendCampaignRun(baseRunRow.id);

    expect(result?.action).toBe('refreshed');
    expect(result?.run.status).toBe('failed');
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('drains due scheduled local campaign runs through the existing send batch path', async () => {
    mockPool.query.mockImplementation((query: unknown, values?: unknown[]) => {
      const sql = String(query);
      if (sql.includes('WITH stale_recipients AS')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes('WITH candidate_runs AS')) {
        expect(sql).toContain("cr.provider = 'local_email'");
        expect(sql).toContain("cr.status = 'scheduled'");
        expect(sql).toContain('cr.requested_send_time <= CURRENT_TIMESTAMP');
        expect(sql).toContain("cr.status = 'sending'");
        expect(sql).toContain("crr.status = 'queued'");
        expect(sql).toContain('FOR UPDATE SKIP LOCKED');
        expect(values).toEqual([3]);
        return Promise.resolve({ rows: [{ id: baseRunRow.id }], rowCount: 1 });
      }
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [
            {
              ...baseRunRow,
              status: 'scheduled',
              requested_send_time: new Date('2026-05-02T00:00:00Z'),
            },
          ],
          rowCount: 1,
        });
      }
      if (sql.includes('UPDATE campaign_run_recipients') && sql.includes("SET status = 'sending'")) {
        return Promise.resolve({
          rows: [{ id: 'recipient-1', email: 'ada@example.org' }],
          rowCount: 1,
        });
      }
      if (sql.includes('SELECT COUNT(*)::text AS count')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 });
      }
      if (sql.includes('UPDATE campaign_runs')) {
        return Promise.resolve({ rows: [{ ...baseRunRow, status: 'sent' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    mockSendMail.mockResolvedValue(true);

    const processed = await drainDueLocalCampaignRuns(3);

    expect(processed).toBe(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.org',
        subject: 'Spring Update',
      })
    );
  });

  it('continues draining existing sending local campaign runs', async () => {
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('WITH stale_recipients AS')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes('WITH candidate_runs AS')) {
        return Promise.resolve({ rows: [{ id: baseRunRow.id }], rowCount: 1 });
      }
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [{ ...baseRunRow, status: 'sending' }],
          rowCount: 1,
        });
      }
      if (sql.includes('UPDATE campaign_run_recipients') && sql.includes("SET status = 'sending'")) {
        return Promise.resolve({
          rows: [{ id: 'recipient-1', email: 'ada@example.org' }],
          rowCount: 1,
        });
      }
      if (sql.includes('SELECT COUNT(*)::text AS count')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 });
      }
      if (sql.includes('UPDATE campaign_runs')) {
        return Promise.resolve({ rows: [{ ...baseRunRow, status: 'sent' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    mockSendMail.mockResolvedValue(true);

    const processed = await drainDueLocalCampaignRuns(1);

    expect(processed).toBe(1);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('does not send when no due local runs are claimed', async () => {
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('WITH stale_recipients AS')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes('WITH candidate_runs AS')) {
        expect(sql).toContain("cr.provider = 'local_email'");
        expect(sql).not.toContain("cr.status = 'draft'");
        expect(sql).toContain('cr.requested_send_time <= CURRENT_TIMESTAMP');
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      throw new Error(`Unexpected query after empty drain claim: ${sql}`);
    });

    const processed = await drainDueLocalCampaignRuns(5);

    expect(processed).toBe(0);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('lists local campaign run recipients with optional status filtering', async () => {
    mockPool.query.mockImplementation((query: unknown, values?: unknown[]) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({ rows: [baseRunRow], rowCount: 1 });
      }
      if (sql.includes('FROM campaign_run_recipients crr')) {
        expect(values).toEqual([baseRunRow.id, 'queued', 5]);
        return Promise.resolve({
          rows: [
            {
              id: 'recipient-1',
              campaign_run_id: baseRunRow.id,
              contact_id: contactIds.deliverable,
              email: 'ada@example.org',
              status: 'queued',
              contact_name: 'Ada Lovelace',
              failure_message: null,
              sent_at: null,
              created_at: new Date('2026-05-01T00:00:00Z'),
              updated_at: new Date('2026-05-01T00:00:00Z'),
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await communicationsService.listCampaignRunRecipients(
      baseRunRow.id,
      { status: 'queued', limit: 5 }
    );

    expect(result).toEqual({
      runId: baseRunRow.id,
      status: 'queued',
      limit: 5,
      recipients: [
        expect.objectContaining({
          id: 'recipient-1',
          campaignRunId: baseRunRow.id,
          contactId: contactIds.deliverable,
          email: 'ada@example.org',
          status: 'queued',
          contactName: 'Ada Lovelace',
        }),
      ],
    });
  });

  it('cancels queued and sending local recipients', async () => {
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [{ ...baseRunRow, status: 'sending' }],
          rowCount: 1,
        });
      }
      if (sql.includes('UPDATE campaign_run_recipients') && sql.includes("SET status = 'canceled'")) {
        return Promise.resolve({
          rows: [{ id: 'recipient-1' }, { id: 'recipient-2' }],
          rowCount: 2,
        });
      }
      if (sql.includes('UPDATE campaign_runs')) {
        return Promise.resolve({
          rows: [
            {
              ...baseRunRow,
              status: 'canceled',
              counts: { canceledRecipientCount: 2 },
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await communicationsService.cancelCampaignRun(baseRunRow.id);

    expect(result?.action).toBe('canceled');
    expect(result?.run.status).toBe('canceled');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'canceled'"),
      [baseRunRow.id]
    );
  });

  it('reschedules draft and scheduled local campaign runs', async () => {
    const nextSendTime = new Date('2026-05-02T15:30:00Z');
    mockPool.query.mockImplementation((query: unknown, values?: unknown[]) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({ rows: [baseRunRow], rowCount: 1 });
      }
      if (sql.includes('UPDATE campaign_runs') && sql.includes('requested_send_time = $2')) {
        expect(values?.[1]).toBe(nextSendTime);
        return Promise.resolve({
          rows: [
            {
              ...baseRunRow,
              requested_send_time: nextSendTime,
              status: 'scheduled',
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await communicationsService.rescheduleCampaignRun(baseRunRow.id, {
      sendTime: nextSendTime,
    });

    expect(result?.action).toBe('rescheduled');
    expect(result?.run.status).toBe('scheduled');
    expect(result?.run.requestedSendTime).toBe(nextSendTime);
  });

  it('requeues failed local campaign recipients for operator-triggered retry', async () => {
    mockPool.query.mockImplementation((query: unknown) => {
      const sql = String(query);
      if (sql.includes('FROM campaign_runs') && sql.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [
            {
              ...baseRunRow,
              status: 'failed',
              counts: { failedRecipientCount: 2, sentRecipientCount: 3 },
              failure_message: 'One or more local email recipients failed',
            },
          ],
          rowCount: 1,
        });
      }
      if (
        sql.includes('UPDATE campaign_run_recipients') &&
        sql.includes("status = 'queued'") &&
        sql.includes('provider_message_id = NULL') &&
        sql.includes('failure_message = NULL') &&
        sql.includes('sent_at = NULL')
      ) {
        return Promise.resolve({
          rows: [{ id: 'recipient-1' }, { id: 'recipient-2' }],
          rowCount: 2,
        });
      }
      if (sql.includes('UPDATE campaign_runs') && sql.includes('lastFailedRecipientRetry')) {
        return Promise.resolve({
          rows: [
            {
              ...baseRunRow,
              status: 'sending',
              counts: {
                sentRecipientCount: 3,
                failedRecipientCount: 0,
                queuedRecipientCount: 2,
                failedRecipientRetryCount: 1,
                lastFailedRecipientRetry: {
                  source: 'operator',
                  requeuedRecipientCount: 2,
                },
              },
              failure_message: null,
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const result = await communicationsService.retryFailedCampaignRunRecipients(baseRunRow.id);

    expect(result?.action).toBe('queued');
    expect(result?.message).toMatch(/send the campaign run again/i);
    expect(result?.run.status).toBe('sending');
    expect(result?.run.counts).toEqual(
      expect.objectContaining({
        failedRecipientCount: 0,
        queuedRecipientCount: 2,
        failedRecipientRetryCount: 1,
      })
    );
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('surfaces unsupported Mailchimp retry behavior through the communications facade without delegating', async () => {
    const mailchimpRun = {
      ...baseRunRow,
      provider: 'mailchimp',
      provider_campaign_id: 'campaign-1',
    };
    mockPool.query.mockResolvedValue({ rows: [mailchimpRun], rowCount: 1 });

    const result = await communicationsService.retryFailedCampaignRunRecipients(baseRunRow.id);

    expect(result).toEqual(
      expect.objectContaining({
        action: 'unsupported',
        message: 'Failed-recipient retry is only supported for local email campaign runs',
      })
    );
    expect(mockMailchimpService.sendCampaignRun).not.toHaveBeenCalled();
  });

  it('gates Mailchimp campaign-run cancellation in the communications facade', async () => {
    const mailchimpRun = {
      ...baseRunRow,
      provider: 'mailchimp',
      provider_campaign_id: 'campaign-1',
    };
    mockPool.query.mockResolvedValue({ rows: [mailchimpRun], rowCount: 1 });

    const result = await communicationsService.cancelCampaignRun(baseRunRow.id);

    expect(result?.action).toBe('unsupported');
    expect(result?.run.provider).toBe('mailchimp');
    expect(result?.message).toBe(
      'Mailchimp campaign-run cancellation is not implemented by this backend contract.'
    );
    expect(mockMailchimpService.sendCampaignRun).not.toHaveBeenCalled();
  });

  it('gates Mailchimp campaign-run rescheduling in the communications facade', async () => {
    const mailchimpRun = {
      ...baseRunRow,
      provider: 'mailchimp',
      provider_campaign_id: 'campaign-1',
    };
    mockPool.query.mockResolvedValue({ rows: [mailchimpRun], rowCount: 1 });

    const result = await communicationsService.rescheduleCampaignRun(baseRunRow.id, {
      sendTime: new Date('2026-05-02T15:30:00Z'),
    });

    expect(result?.action).toBe('unsupported');
    expect(result?.run.provider).toBe('mailchimp');
    expect(result?.message).toBe(
      'Mailchimp campaign-run rescheduling is not implemented by this backend contract.'
    );
    expect(mockMailchimpService.sendCampaignRun).not.toHaveBeenCalled();
  });

  it('delegates explicit Mailchimp campaign creation to the existing Mailchimp service', async () => {
    mockMailchimpService.createCampaign.mockResolvedValue({
      id: 'mailchimp-campaign-1',
      type: 'regular',
      status: 'save',
      title: 'Provider Campaign',
      listId: 'list-1',
      createdAt: new Date('2026-05-01T00:00:00Z'),
    });

    await communicationsService.createCampaign({
      provider: 'mailchimp',
      listId: 'list-1',
      title: 'Provider Campaign',
      subject: 'Provider Campaign',
      fromName: 'Team',
      replyTo: 'team@example.org',
      plainTextContent: 'Hello',
    });

    expect(mockMailchimpService.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: 'list-1',
        title: 'Provider Campaign',
      })
    );
  });
});
