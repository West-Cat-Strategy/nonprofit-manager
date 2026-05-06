import type { Pool } from 'pg';
import { PublicActionService } from '@services/publishing/publicActionService';

jest.mock('@services/publishing/siteManagementService', () => ({
  __mocks: {
    getSite: jest.fn(),
    getPublicSiteByIdForPreview: jest.fn(),
    getSiteBySubdomainForPreview: jest.fn(),
    getSiteByDomainForPreview: jest.fn(),
  },
  SiteManagementService: jest.fn().mockImplementation(function SiteManagementServiceMock() {
    const module = jest.requireMock('@services/publishing/siteManagementService') as {
      __mocks: {
        getSite: jest.Mock;
        getPublicSiteByIdForPreview: jest.Mock;
        getSiteBySubdomainForPreview: jest.Mock;
        getSiteByDomainForPreview: jest.Mock;
      };
    };

    return {
      getSite: module.__mocks.getSite,
      getPublicSiteByIdForPreview: module.__mocks.getPublicSiteByIdForPreview,
      getSiteBySubdomainForPreview: module.__mocks.getSiteBySubdomainForPreview,
      getSiteByDomainForPreview: module.__mocks.getSiteByDomainForPreview,
    };
  }),
}));

jest.mock('@container/services', () => ({
  services: {
    contact: {
      createContact: jest.fn(),
    },
  },
}));

const siteManagementModule = jest.requireMock('@services/publishing/siteManagementService') as {
  __mocks: {
    getSite: jest.Mock;
    getPublicSiteByIdForPreview: jest.Mock;
    getSiteBySubdomainForPreview: jest.Mock;
    getSiteByDomainForPreview: jest.Mock;
  };
};

const servicesModule = jest.requireMock('@container/services') as {
  services: {
    contact: {
      createContact: jest.Mock;
    };
  };
};

const now = '2026-05-01T12:00:00.000Z';

const baseSite = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'user-1',
  ownerUserId: 'owner-1',
  organizationId: '22222222-2222-4222-8222-222222222222',
  siteKind: 'organization',
  parentSiteId: null,
  migrationStatus: 'complete',
};

const actionRow = (overrides: Record<string, unknown> = {}) => ({
  id: '33333333-3333-4333-8333-333333333333',
  organization_id: baseSite.organizationId,
  site_id: baseSite.id,
  page_id: null,
  component_id: null,
  action_type: 'petition_signature',
  status: 'published',
  slug: 'save-the-library',
  title: 'Save the Library',
  description: null,
  settings: {},
  confirmation_message: null,
  published_at: now,
  closed_at: null,
  submission_count: 0,
  created_at: now,
  updated_at: now,
  ...overrides,
});

const submissionRow = (overrides: Record<string, unknown> = {}) => ({
  id: '44444444-4444-4444-8444-444444444444',
  organization_id: baseSite.organizationId,
  site_id: baseSite.id,
  action_id: '33333333-3333-4333-8333-333333333333',
  action_type: 'petition_signature',
  review_status: 'new',
  contact_id: null,
  source_entity_type: null,
  source_entity_id: null,
  duplicate_of_submission_id: null,
  consent: { accepted: true },
  payload_redacted: {},
  generated_artifact: {},
  page_path: '/petition',
  visitor_id: 'visitor-1',
  session_id: 'session-1',
  referrer: null,
  submitted_at: now,
  created_at: now,
  updated_at: now,
  ...overrides,
});

describe('PublicActionService', () => {
  let mockQuery: jest.Mock;
  let service: PublicActionService;

  beforeEach(() => {
    mockQuery = jest.fn();
    service = new PublicActionService({ query: mockQuery } as unknown as Pool);
    Object.values(siteManagementModule.__mocks).forEach((mock) => mock.mockReset());
    servicesModule.services.contact.createContact.mockReset();
    siteManagementModule.__mocks.getPublicSiteByIdForPreview.mockResolvedValue(baseSite);
    siteManagementModule.__mocks.getSiteBySubdomainForPreview.mockResolvedValue(null);
    siteManagementModule.__mocks.getSiteByDomainForPreview.mockResolvedValue(null);
    servicesModule.services.contact.createContact.mockResolvedValue({
      contact_id: '55555555-5555-4555-8555-555555555555',
    });
  });

  it('lists published public actions for runtime counts with current submission totals', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [actionRow({ submission_count: 12 })],
    });

    const result = await service.listPublishedActionsForSite(baseSite as never);

    expect(result).toEqual([
      expect.objectContaining({
        actionType: 'petition_signature',
        slug: 'save-the-library',
        status: 'published',
        submissionCount: 12,
      }),
    ]);
    expect(mockQuery.mock.calls[0][0]).toContain("a.status = 'published'");
    expect(mockQuery.mock.calls[0][1]).toEqual([baseSite.id]);
  });

  it('lists staff self-referral actions with status and submission totals for operational snapshots', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mockQuery.mockResolvedValueOnce({
      rows: [
        actionRow({
          action_type: 'self_referral',
          status: 'closed',
          slug: 'get-help',
          title: 'Get Help',
          submission_count: 7,
        }),
      ],
    });

    const result = await service.listActions(baseSite.id, 'user-1', baseSite.organizationId);

    expect(siteManagementModule.__mocks.getSite).toHaveBeenCalledWith(
      baseSite.id,
      'user-1',
      baseSite.organizationId
    );
    expect(result).toEqual([
      expect.objectContaining({
        actionType: 'self_referral',
        slug: 'get-help',
        status: 'closed',
        submissionCount: 7,
      }),
    ]);
    expect(mockQuery.mock.calls[0][0]).toContain('LEFT JOIN website_public_action_submissions');
    expect(mockQuery.mock.calls[0][0]).not.toContain("a.status = 'published'");
    expect(mockQuery.mock.calls[0][1]).toEqual([baseSite.id]);
  });

  it('captures petition submissions without creating contacts until staff acceptance', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [actionRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            contact_id: null,
            source_entity_type: null,
            source_entity_id: null,
            payload_redacted: { email: 'alex@example.org' },
          }),
        ],
      });

    const result = await service.submitPublicAction(
      baseSite.id,
      'save-the-library',
      {
        first_name: 'Alex',
        last_name: 'Chen',
        email: 'alex@example.org',
        consent: true,
        visitorId: 'visitor-1',
        sessionId: 'session-1',
      },
      { idempotencyKey: 'idem-1', pagePath: '/petition', userAgent: 'vitest' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        actionType: 'petition_signature',
        reviewStatus: 'new',
        submissionId: '44444444-4444-4444-8444-444444444444',
      })
    );
    expect(result).not.toHaveProperty('contactId');
    expect(servicesModule.services.contact.createContact).not.toHaveBeenCalled();
    expect(mockQuery.mock.calls[3][0]).toContain('INSERT INTO website_public_action_submissions');
    expect(mockQuery.mock.calls[3][1]).toEqual(
      expect.arrayContaining(['idem-1', '/petition', 'visitor-1', 'session-1', 'vitest'])
    );
    expect(mockQuery.mock.calls[3][1]).toEqual(expect.arrayContaining([null]));
  });

  it('creates accepted public action contacts inside the site owner RLS context when a pool client is available', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    const clientQuery = jest
      .fn()
      .mockResolvedValue(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            review_status: 'accepted',
            contact_id: '55555555-5555-4555-8555-555555555555',
            source_entity_type: 'contact',
            source_entity_id: '55555555-5555-4555-8555-555555555555',
          }),
        ],
      })
      .mockResolvedValueOnce(undefined);
    const client = {
      query: clientQuery,
      release: jest.fn(),
    };
    const pooledQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [actionRow()] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            payload_redacted: { email: 'alex@example.org', first_name: 'Alex', last_name: 'Chen' },
          }),
        ],
      });
    service = new PublicActionService({
      query: pooledQuery,
      connect: jest.fn().mockResolvedValue(client),
    } as unknown as Pool);

    const result = await service.transitionSubmission(
      baseSite.id,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'accept',
      'user-1',
      baseSite.organizationId
    );

    expect(result?.contactId).toBe('55555555-5555-4555-8555-555555555555');
    expect(result?.submission.reviewStatus).toBe('accepted');
    expect(clientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      `SELECT set_config('app.current_user_id', $1, true)`,
      ['owner-1']
    );
    expect(servicesModule.services.contact.createContact).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alex@example.org' }),
      'owner-1',
      undefined,
      client
    );
    expect(clientQuery.mock.calls[3][0]).toContain('UPDATE website_public_action_submissions');
    expect(clientQuery).toHaveBeenLastCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('marks duplicate petition signatures without creating another contact', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [actionRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'existing-submission' }] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            review_status: 'duplicate',
            contact_id: null,
            duplicate_of_submission_id: 'existing-submission',
          }),
        ],
      });

    const result = await service.submitPublicAction(
      baseSite.id,
      'save-the-library',
      { email: 'alex@example.org', consent: true },
      {}
    );

    expect(result.reviewStatus).toBe('duplicate');
    expect(result.contactId).toBeUndefined();
    expect(servicesModule.services.contact.createContact).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('captures pledge submissions without creating pledge rows until staff acceptance', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          actionRow({
            action_type: 'donation_pledge',
            slug: 'pledge-now',
            settings: { currency: 'CAD', campaignId: 'campaign-1', pledgeSchedule: 'monthly' },
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'donation_pledge',
            payload_redacted: { email: 'donor@example.org', amount: 25.5 },
          }),
        ],
      });

    const result = await service.submitPublicAction(
      baseSite.id,
      'pledge-now',
      { email: 'donor@example.org', amount: '25.50', consent: true },
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        actionType: 'donation_pledge',
        reviewStatus: 'new',
      })
    );
    expect(result).not.toHaveProperty('pledgeId');
    expect(result).not.toHaveProperty('contactId');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO website_public_action_submissions');
    expect(mockQuery.mock.calls[1][0]).not.toContain('website_public_pledges');
  });

  it('captures support-letter submissions with generation metadata but no artifact row', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          actionRow({
            action_type: 'support_letter_request',
            slug: 'request-letter',
            settings: {
              templateVersion: 'housing-v1',
              letterTitle: 'Housing support letter',
              letterTemplate: 'Dear reviewer, {{full_name}} needs {{purpose}}.',
            },
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'support_letter_request',
            review_status: 'needs_review',
            payload_redacted: {
              first_name: 'Sam',
              last_name: 'Rivera',
              email: 'sam@example.org',
              purpose: 'rental assistance',
            },
            generated_artifact: {
              templateVersion: 'housing-v1',
            },
          }),
        ],
      });

    const result = await service.submitPublicAction(
      baseSite.id,
      'request-letter',
      {
        first_name: 'Sam',
        last_name: 'Rivera',
        email: 'sam@example.org',
        purpose: 'rental assistance',
        consent: true,
      },
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        actionType: 'support_letter_request',
        reviewStatus: 'needs_review',
      })
    );
    expect(result).not.toHaveProperty('supportLetterId');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO website_public_action_submissions');
    expect(mockQuery.mock.calls[1][0]).not.toContain('website_support_letters');
    expect(JSON.parse(mockQuery.mock.calls[1][1][9] as string)).toEqual(
      expect.objectContaining({ templateVersion: 'housing-v1', generatedAt: expect.any(String) })
    );
  });

  it('accepts pledge submissions by creating contact and pledge side effects once', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          actionRow({
            action_type: 'donation_pledge',
            settings: { currency: 'CAD', campaignId: 'campaign-1', pledgeSchedule: 'monthly' },
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'donation_pledge',
            payload_redacted: { email: 'donor@example.org', amount: 25.5 },
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '66666666-6666-4666-8666-666666666666' }] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'donation_pledge',
            review_status: 'accepted',
            contact_id: '55555555-5555-4555-8555-555555555555',
            source_entity_type: 'public_pledge',
            source_entity_id: '66666666-6666-4666-8666-666666666666',
          }),
        ],
      });

    const result = await service.transitionSubmission(
      baseSite.id,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'accept',
      'user-1',
      baseSite.organizationId
    );

    expect(result).toEqual(
      expect.objectContaining({
        contactId: '55555555-5555-4555-8555-555555555555',
        pledgeId: '66666666-6666-4666-8666-666666666666',
      })
    );
    expect(servicesModule.services.contact.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'donor@example.org',
        tags: ['donation-pledge'],
      }),
      'owner-1',
      undefined,
      undefined
    );
    expect(mockQuery.mock.calls[4][0]).toContain('INSERT INTO website_public_pledges');
    expect(mockQuery.mock.calls[4][1]).toEqual(
      expect.arrayContaining([25.5, 'CAD', JSON.stringify({ cadence: 'monthly' })])
    );
    expect(mockQuery.mock.calls[5][0]).toContain('UPDATE website_public_action_submissions');
    expect(mockQuery.mock.calls[5][1]).toEqual(
      expect.arrayContaining(['accepted', 'public_pledge', '66666666-6666-4666-8666-666666666666'])
    );
  });

  it('rejects submissions without releasing contact or pledge side effects', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mockQuery
      .mockResolvedValueOnce({ rows: [actionRow()] })
      .mockResolvedValueOnce({ rows: [submissionRow({ payload_redacted: { email: 'alex@example.org' } })] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            review_status: 'rejected',
            payload_redacted: { email: 'alex@example.org' },
          }),
        ],
      });

    const result = await service.transitionSubmission(
      baseSite.id,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'reject',
      'user-1',
      baseSite.organizationId
    );

    expect(result?.submission.reviewStatus).toBe('rejected');
    expect(servicesModule.services.contact.createContact).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][0]).toContain("review_status = 'rejected'");
  });

  it('accepts support-letter submissions by creating an approved artifact', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          actionRow({
            action_type: 'support_letter_request',
            settings: {
              templateVersion: 'housing-v1',
              letterTitle: 'Housing support letter',
              letterTemplate: 'Dear reviewer, {{full_name}} needs {{purpose}}.',
            },
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'support_letter_request',
            review_status: 'needs_review',
            payload_redacted: {
              first_name: 'Sam',
              last_name: 'Rivera',
              email: 'sam@example.org',
              purpose: 'rental assistance',
            },
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '77777777-7777-4777-8777-777777777777' }] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'support_letter_request',
            review_status: 'accepted',
            contact_id: '55555555-5555-4555-8555-555555555555',
            source_entity_type: 'support_letter',
            source_entity_id: '77777777-7777-4777-8777-777777777777',
          }),
        ],
      });

    const result = await service.transitionSubmission(
      baseSite.id,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'accept',
      'user-1',
      baseSite.organizationId
    );

    expect(result?.supportLetterId).toBe('77777777-7777-4777-8777-777777777777');
    expect(mockQuery.mock.calls[4][0]).toContain('INSERT INTO website_support_letters');
    expect(mockQuery.mock.calls[4][1]).toEqual(
      expect.arrayContaining([
        'housing-v1',
        'Housing support letter',
        'Dear reviewer, Sam Rivera needs rental assistance.',
        'user-1',
      ])
    );
    expect(JSON.parse(mockQuery.mock.calls[4][1][8] as string)).toEqual(
      expect.objectContaining({ templateVersion: 'housing-v1', generatedAt: expect.any(String) })
    );
    expect(mockQuery.mock.calls[5][1]).toEqual(
      expect.arrayContaining(['accepted', 'support_letter', '77777777-7777-4777-8777-777777777777'])
    );
  });

  it('fulfills accepted support-letter submissions by marking the artifact sent', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          actionRow({
            action_type: 'support_letter_request',
          }),
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'support_letter_request',
            review_status: 'accepted',
            contact_id: '55555555-5555-4555-8555-555555555555',
            source_entity_type: 'support_letter',
            source_entity_id: '77777777-7777-4777-8777-777777777777',
            payload_redacted: {
              first_name: 'Sam',
              last_name: 'Rivera',
              email: 'sam@example.org',
              purpose: 'rental assistance',
            },
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: '77777777-7777-4777-8777-777777777777' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          submissionRow({
            action_type: 'support_letter_request',
            review_status: 'fulfilled',
            contact_id: '55555555-5555-4555-8555-555555555555',
            source_entity_type: 'support_letter',
            source_entity_id: '77777777-7777-4777-8777-777777777777',
          }),
        ],
      });

    const result = await service.transitionSubmission(
      baseSite.id,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'fulfill',
      'user-1',
      baseSite.organizationId
    );

    expect(result?.submission.reviewStatus).toBe('fulfilled');
    expect(result?.supportLetterId).toBe('77777777-7777-4777-8777-777777777777');
    expect(mockQuery.mock.calls[3][0]).toContain('UPDATE website_support_letters');
    expect(mockQuery.mock.calls[3][0]).toContain("ELSE 'approved'");
    expect(mockQuery.mock.calls[4][0]).toContain("approval_status = 'sent'");
    expect(mockQuery.mock.calls[5][1]).toEqual(expect.arrayContaining(['fulfilled']));
  });

  it('retrieves only accepted support-letter artifacts for staff review', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          organization_id: baseSite.organizationId,
          site_id: baseSite.id,
          action_id: '33333333-3333-4333-8333-333333333333',
          submission_id: '44444444-4444-4444-8444-444444444444',
          contact_id: '55555555-5555-4555-8555-555555555555',
          template_version: 'housing-v1',
          letter_title: 'Housing support letter',
          letter_body: 'Dear reviewer, Sam Rivera needs rental assistance.',
          approval_status: 'approved',
          generated_metadata: { templateVersion: 'housing-v1' },
          approved_at: null,
          approved_by: null,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    const artifact = await service.getSupportLetterArtifact(
      baseSite.id,
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
      'user-1',
      baseSite.organizationId
    );

    expect(siteManagementModule.__mocks.getSite).toHaveBeenCalledWith(
      baseSite.id,
      'user-1',
      baseSite.organizationId
    );
    expect(mockQuery.mock.calls[0][0]).toContain('FROM website_support_letters');
    expect(mockQuery.mock.calls[0][0]).toContain("s.review_status IN ('accepted', 'fulfilled')");
    expect(mockQuery.mock.calls[0][0]).toContain("sl.approval_status IN ('approved', 'sent')");
    expect(artifact).toEqual(
      expect.objectContaining({
        id: '77777777-7777-4777-8777-777777777777',
        letterTitle: 'Housing support letter',
        letterBody: 'Dear reviewer, Sam Rivera needs rental assistance.',
        approvalStatus: 'approved',
      })
    );
  });
});
