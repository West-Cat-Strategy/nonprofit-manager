import type { Pool } from 'pg';
import { WebsiteEntryService } from '@services/publishing/websiteEntryService';

jest.mock('@services/publishing/siteManagementService', () => ({
  __mocks: {
    getSite: jest.fn(),
  },
  SiteManagementService: jest.fn().mockImplementation(function SiteManagementServiceMock() {
    const module = jest.requireMock('@services/publishing/siteManagementService') as {
      __mocks: {
        getSite: jest.Mock;
      };
    };

    return {
      getSite: module.__mocks.getSite,
    };
  }),
}));

jest.mock('@services/mailchimpService', () => ({
  __mocks: {
    getCampaigns: jest.fn(),
  },
  getCampaigns: (...args: unknown[]) => {
    const module = jest.requireMock('@services/mailchimpService') as {
      __mocks: {
        getCampaigns: jest.Mock;
      };
    };

    return module.__mocks.getCampaigns(...args);
  },
}));

jest.mock('@services/mauticService', () => ({
  __esModule: true,
  default: {
    getEmails: jest.fn(),
  },
}));

jest.mock('@services/publishing/siteSettingsService', () => ({
  WebsiteSiteSettingsService: jest.fn().mockImplementation(function WebsiteSiteSettingsServiceMock() {
    const module = jest.requireMock('@services/publishing/siteSettingsService') as {
      __mocks: {
        getSettingsForSite: jest.Mock;
      };
    };

    return {
      getSettingsForSite: module.__mocks.getSettingsForSite,
    };
  }),
  __mocks: {
    getSettingsForSite: jest.fn(),
  },
}));

const siteManagementModule = jest.requireMock('@services/publishing/siteManagementService') as {
  __mocks: {
    getSite: jest.Mock;
  };
};

const mailchimpModule = jest.requireMock('@services/mailchimpService') as {
  __mocks: {
    getCampaigns: jest.Mock;
  };
};

const mauticModule = jest.requireMock('@services/mauticService') as {
  default: {
    getEmails: jest.Mock;
  };
};

const siteSettingsModule = jest.requireMock('@services/publishing/siteSettingsService') as {
  __mocks: {
    getSettingsForSite: jest.Mock;
  };
};

describe('WebsiteEntryService', () => {
  const baseSite = {
    id: 'site-1',
    userId: 'user-1',
    ownerUserId: 'owner-1',
    organizationId: 'org-1',
    siteKind: 'organization',
    parentSiteId: null,
    migrationStatus: 'complete',
  };

  let pool: Pool;
  let mockQuery: jest.Mock;
  let service: WebsiteEntryService;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool = { query: mockQuery } as unknown as Pool;
    service = new WebsiteEntryService(pool);
    siteManagementModule.__mocks.getSite.mockReset();
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
    mailchimpModule.__mocks.getCampaigns.mockReset();
    mauticModule.default.getEmails.mockReset();
    siteSettingsModule.__mocks.getSettingsForSite.mockReset();
    siteSettingsModule.__mocks.getSettingsForSite.mockResolvedValue({
      mautic: {
        baseUrl: 'https://mautic.example.org',
        username: 'site-api',
        password: 'site-secret',
        segmentId: 'segment-1',
      },
    });
  });

  it('creates native entries with normalized slugs and actor attribution', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'entry-1',
          organization_id: 'org-1',
          site_id: 'site-1',
          kind: 'newsletter',
          source: 'native',
          status: 'published',
          slug: 'spring-update',
          title: 'Spring Update!',
          excerpt: null,
          body: null,
          body_html: null,
          seo: {},
          metadata: {},
          external_source_id: null,
          published_at: '2026-03-01T00:00:00.000Z',
          created_by: 'user-1',
          updated_by: 'user-1',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ],
    });

    const entry = await service.createEntry(
      'site-1',
      'user-1',
      {
        kind: 'newsletter',
        title: ' Spring Update! ',
        status: 'published',
      },
      'org-1'
    );

    expect(entry.slug).toBe('spring-update');
    expect(entry.createdBy).toBe('user-1');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO website_entries');
    expect(mockQuery.mock.calls[0][1]).toEqual([
      'org-1',
      'site-1',
      'newsletter',
      'published',
      'spring-update',
      'Spring Update!',
      null,
      null,
      null,
      '{}',
      '{}',
      expect.any(String),
      'user-1',
    ]);
  });

  it('rejects manual creation of non-native website entries', async () => {
    await expect(
      service.createEntry(
        'site-1',
        'user-1',
        {
          kind: 'newsletter',
          title: 'Imported Campaign',
          source: 'mailchimp',
        },
        'org-1'
      )
    ).rejects.toThrow('Only native website entries can be created manually');

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('syncs only sent Mailchimp campaigns and returns refreshed entries', async () => {
    mailchimpModule.__mocks.getCampaigns.mockResolvedValue([
      {
        id: 'cmp-sent',
        listId: 'list-1',
        title: 'March Update',
        subject: 'March 2026',
        status: 'sent',
        sendTime: new Date('2026-03-02T00:00:00.000Z'),
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        reportSummary: {
          opens: 60,
          uniqueOpens: 40,
          openRate: 0.5,
          clicks: 12,
          uniqueClicks: 10,
          clickRate: 0.125,
          unsubscribes: 2,
          bounces: 1,
        },
        emailsSent: 120,
      },
      {
        id: 'cmp-draft',
        listId: 'list-1',
        title: 'Draft Update',
        subject: 'Ignore this one',
        status: 'draft',
        sendTime: null,
        createdAt: new Date('2026-03-03T00:00:00.000Z'),
      },
    ]);
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'entry-mailchimp-1',
            organization_id: 'org-1',
            site_id: 'site-1',
            kind: 'newsletter',
            source: 'mailchimp',
            status: 'published',
            slug: 'march-update',
            title: 'March Update',
            excerpt: 'March 2026',
            body: null,
            body_html: null,
            seo: {},
            metadata: {},
            external_source_id: 'cmp-sent',
            published_at: '2026-03-02T00:00:00.000Z',
            created_by: 'user-1',
            updated_by: 'user-1',
            created_at: '2026-03-02T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
          },
        ],
      });

    const result = await service.syncMailchimpCampaigns('site-1', 'user-1', 'list-1', 'org-1');

    expect(mailchimpModule.__mocks.getCampaigns).toHaveBeenCalledWith('list-1');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT (site_id, source, external_source_id)');
    expect(mockQuery.mock.calls[0][1]).toEqual([
      'org-1',
      'site-1',
      'march-update',
      'March Update',
      'March 2026',
      JSON.stringify({
        title: 'March Update',
        description: 'March 2026',
      }),
      JSON.stringify({
        source: 'mailchimp',
        listId: 'list-1',
        reportSummary: {
          opens: 60,
          uniqueOpens: 40,
          openRate: 0.5,
          clicks: 12,
          uniqueClicks: 10,
          clickRate: 0.125,
          unsubscribes: 2,
          bounces: 1,
        },
        emailsSent: 120,
        campaignEvidence: {
          provider: 'mailchimp',
          providerItemId: 'cmp-sent',
          providerAudienceId: 'list-1',
          providerStatus: 'sent',
          reportedAt: '2026-03-02T00:00:00.000Z',
          lastProviderActivityAt: '2026-03-02T00:00:00.000Z',
          sentCount: 120,
          openCount: 40,
          openRate: 0.5,
          clickCount: 10,
          clickRate: 0.125,
          unsubscribeCount: 2,
          bounceCount: 1,
        },
      }),
      'cmp-sent',
      '2026-03-02T00:00:00.000Z',
      'user-1',
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.source).toBe('mailchimp');
    expect(siteManagementModule.__mocks.getSite).toHaveBeenCalledTimes(2);
  });

  it('syncs published Mautic emails into read-only website entries', async () => {
    mauticModule.default.getEmails.mockResolvedValue([
      {
        id: 'email-1',
        name: 'April Newsletter',
        subject: 'April 2026',
        preheaderText: 'Program highlights',
        customHtml: '<p>April body</p>',
        plainText: 'April body',
        isPublished: true,
        emailType: 'list',
        sentCount: 42,
        readCount: 11,
        lists: ['segment-1'],
        dateAdded: '2026-04-01T00:00:00.000Z',
        dateModified: '2026-04-02T00:00:00.000Z',
      },
    ]);
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'entry-mautic-1',
            organization_id: 'org-1',
            site_id: 'site-1',
            kind: 'newsletter',
            source: 'mautic',
            status: 'published',
            slug: 'april-newsletter',
            title: 'April Newsletter',
            excerpt: 'Program highlights',
            body: 'April body',
            body_html: '<p>April body</p>',
            seo: {},
            metadata: {},
            external_source_id: 'email-1',
            published_at: '2026-04-02T00:00:00.000Z',
            created_by: 'user-1',
            updated_by: 'user-1',
            created_at: '2026-04-02T00:00:00.000Z',
            updated_at: '2026-04-02T00:00:00.000Z',
          },
        ],
      });

    const result = await service.syncMauticEmails('site-1', 'user-1', 'segment-1', 'org-1');

    expect(siteSettingsModule.__mocks.getSettingsForSite).toHaveBeenCalledWith(baseSite);
    expect(mauticModule.default.getEmails).toHaveBeenCalledWith(
      {
        baseUrl: 'https://mautic.example.org',
        username: 'site-api',
        password: 'site-secret',
        segmentId: 'segment-1',
      },
      { segmentId: 'segment-1' }
    );
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT (site_id, source, external_source_id)');
    expect(mockQuery.mock.calls[0][1]).toEqual([
      'org-1',
      'site-1',
      'april-newsletter',
      'April Newsletter',
      'Program highlights',
      'April body',
      '<p>April body</p>',
      JSON.stringify({
        title: 'April Newsletter',
        description: 'Program highlights',
      }),
      JSON.stringify({
        source: 'mautic',
        segmentId: 'segment-1',
        subject: 'April 2026',
        emailType: 'list',
        lists: ['segment-1'],
        sentCount: 42,
        readCount: 11,
        campaignEvidence: {
          provider: 'mautic',
          providerItemId: 'email-1',
          providerAudienceId: 'segment-1',
          providerStatus: 'published',
          reportedAt: '2026-04-02T00:00:00.000Z',
          lastProviderActivityAt: '2026-04-02T00:00:00.000Z',
          sentCount: 42,
          openCount: 11,
          openRate: 11 / 42,
          emailType: 'list',
        },
      }),
      'email-1',
      '2026-04-02T00:00:00.000Z',
      'user-1',
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.source).toBe('mautic');
  });

  it('keeps Mautic-synced entries read-only', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'entry-mautic-1',
          organization_id: 'org-1',
          site_id: 'site-1',
          kind: 'newsletter',
          source: 'mautic',
          status: 'published',
          slug: 'april-newsletter',
          title: 'April Newsletter',
          excerpt: null,
          body: null,
          body_html: null,
          seo: {},
          metadata: {},
          external_source_id: 'email-1',
          published_at: '2026-04-02T00:00:00.000Z',
          created_by: 'user-1',
          updated_by: 'user-1',
          created_at: '2026-04-02T00:00:00.000Z',
          updated_at: '2026-04-02T00:00:00.000Z',
        },
      ],
    });

    await expect(
      service.updateEntry(
        'site-1',
        'entry-mautic-1',
        'user-1',
        { title: 'Edited title' },
        'org-1'
      )
    ).rejects.toThrow('Provider-synced entries are read-only');
  });
});
