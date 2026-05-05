import type { Pool } from 'pg';
import { buildPublicFormRuntimeScript } from '@modules/publishing/services/publicSiteRuntime/shared';
import { PublicSiteRuntimeService } from '@modules/publishing/services/publicSiteRuntimeService';

jest.mock('@modules/events/services/eventService', () => ({
  __mocks: {
    listPublicEventsByOwner: jest.fn(),
    getPublicEventBySlug: jest.fn(),
  },
  EventService: jest.fn().mockImplementation(function EventServiceMock() {
    const module = jest.requireMock('@modules/events/services/eventService') as {
      __mocks: {
        listPublicEventsByOwner: jest.Mock;
        getPublicEventBySlug: jest.Mock;
      };
    };

    return {
      listPublicEventsByOwner: module.__mocks.listPublicEventsByOwner,
      getPublicEventBySlug: module.__mocks.getPublicEventBySlug,
    };
  }),
}));

jest.mock('@services/publishing/websiteEntryService', () => ({
  __mocks: {
    listPublicNewsletters: jest.fn(),
    getPublicNewsletterBySlug: jest.fn(),
  },
  WebsiteEntryService: jest.fn(),
  websiteEntryService: {
    listPublicNewsletters: (...args: unknown[]) => {
      const module = jest.requireMock('@services/publishing/websiteEntryService') as {
        __mocks: {
          listPublicNewsletters: jest.Mock;
        };
      };

      return module.__mocks.listPublicNewsletters(...args);
    },
    getPublicNewsletterBySlug: (...args: unknown[]) => {
      const module = jest.requireMock('@services/publishing/websiteEntryService') as {
        __mocks: {
          getPublicNewsletterBySlug: jest.Mock;
        };
      };

      return module.__mocks.getPublicNewsletterBySlug(...args);
    },
  },
}));

const eventServiceModule = jest.requireMock('@modules/events/services/eventService') as {
  __mocks: {
    listPublicEventsByOwner: jest.Mock;
    getPublicEventBySlug: jest.Mock;
  };
};

const websiteEntryModule = jest.requireMock('@services/publishing/websiteEntryService') as {
  __mocks: {
    listPublicNewsletters: jest.Mock;
    getPublicNewsletterBySlug: jest.Mock;
  };
};

describe('PublicSiteRuntimeService', () => {
  let mockQuery: jest.Mock;
  let service: PublicSiteRuntimeService;

  const baseSite = {
    id: 'site-1',
    userId: 'user-1',
    ownerUserId: 'owner-1',
    organizationId: 'org-1',
    siteKind: 'organization',
    parentSiteId: null,
    migrationStatus: 'complete',
    name: 'Neighborhood Mutual Aid',
    analyticsEnabled: false,
    publishedContent: {
      templateId: 'template-1',
      templateName: 'Community Template',
      theme: {
        colors: {
          primary: '#1f4d3b',
          secondary: '#264f46',
          accent: '#c7683c',
          background: '#f6f5ef',
          surface: '#ffffff',
          text: '#163126',
          textMuted: '#60716a',
          border: '#d8e1dc',
          error: '#b42318',
          success: '#027a48',
          warning: '#b54708',
        },
        typography: {
          fontFamily: 'system-ui',
          headingFontFamily: 'system-ui',
          baseFontSize: '16px',
          lineHeight: '1.6',
          headingLineHeight: '1.2',
          fontWeightNormal: 400,
          fontWeightMedium: 500,
          fontWeightBold: 700,
        },
        borderRadius: {
          sm: '6px',
          md: '12px',
          lg: '18px',
          full: '999px',
        },
        shadows: {
          sm: 'none',
          md: 'none',
          lg: 'none',
        },
      },
      pages: [],
      navigation: {
        items: [{ id: 'nav-1', label: 'Home', url: '/' }],
        style: 'horizontal',
        sticky: false,
        transparent: false,
      },
      footer: {
        columns: [],
        copyright: 'Copyright',
      },
      seoDefaults: {
        title: 'Neighborhood Mutual Aid',
        description: 'Community support',
      },
      publishedAt: '2026-03-01T00:00:00.000Z',
      version: 'v1',
    },
  };

  beforeEach(() => {
    mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    service = new PublicSiteRuntimeService({ query: mockQuery } as unknown as Pool);
    eventServiceModule.__mocks.listPublicEventsByOwner.mockReset();
    eventServiceModule.__mocks.getPublicEventBySlug.mockReset();
    websiteEntryModule.__mocks.listPublicNewsletters.mockReset();
    websiteEntryModule.__mocks.getPublicNewsletterBySlug.mockReset();
  });

  it('does not duplicate event detail fallback when the page already has an event-detail component', async () => {
    eventServiceModule.__mocks.getPublicEventBySlug.mockResolvedValue({
      event_id: 'event-1',
      event_name: 'Spring Gala',
      slug: 'spring-gala',
      event_type: 'fundraiser',
      start_date: '2026-04-15T19:00:00.000Z',
      description: 'A seasonal fundraiser for community programs.',
      location_name: 'Town Hall',
      address_line1: null,
      address_line2: null,
      city: 'Vancouver',
      state_province: 'BC',
      postal_code: null,
      country: 'Canada',
      capacity: 120,
      registered_count: 64,
    });

    const site = {
      ...baseSite,
      publishedContent: {
        ...baseSite.publishedContent,
        pages: [
          {
            id: 'page-events-detail',
            slug: 'events-detail',
            name: 'Event Detail',
            isHomepage: false,
            pageType: 'collectionDetail',
            collection: 'events',
            routePattern: '/events/:slug',
            sections: [
              {
                id: 'section-1',
                name: 'Event detail section',
                components: [
                  {
                    id: 'event-detail-1',
                    type: 'event-detail',
                  },
                ],
              },
            ],
            seo: {},
          },
        ],
      },
    };

    const html = await service.renderSitePage(site as never, '/events/spring-gala');

    expect(html).toContain('Spring Gala');
    expect((html?.match(/class="npm-detail"/g) || []).length).toBe(1);
    expect(html).toContain('/api/v2/public/events/event-1/registrations');
  });

  it('threads published public-action counts into static petition blocks', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'action-1',
            organization_id: 'org-1',
            site_id: 'site-1',
            page_id: null,
            component_id: null,
            action_type: 'petition_signature',
            status: 'published',
            slug: 'save-the-library',
            title: 'Save the Library',
            description: null,
            settings: {},
            confirmation_message: null,
            published_at: '2026-05-01T00:00:00.000Z',
            closed_at: null,
            submission_count: 1,
            created_at: '2026-05-01T00:00:00.000Z',
            updated_at: '2026-05-01T00:00:00.000Z',
          },
        ],
      });

    const site = {
      ...baseSite,
      publishedContent: {
        ...baseSite.publishedContent,
        pages: [
          {
            id: 'page-petition',
            slug: 'petition',
            name: 'Petition',
            isHomepage: false,
            pageType: 'static',
            routePattern: '/petition',
            sections: [
              {
                id: 'section-1',
                name: 'Petition section',
                components: [
                  {
                    id: 'petition-block',
                    type: 'petition-form',
                    actionSlug: 'save-the-library',
                    showSignatureCount: true,
                    petitionStatement: 'Keep the public library open.',
                  },
                ],
              },
            ],
            seo: {},
          },
        ],
      },
    };

    const html = await service.renderSitePage(site as never, '/petition');

    expect(html).toContain('1 signature');
    expect(html).toContain(
      'action="/api/v2/public/actions/site-1/save-the-library/submissions"'
    );
    expect(mockQuery.mock.calls[1][0]).toContain("a.status = 'published'");
  });

  it('renders newsletter detail pages from live website entries', async () => {
    websiteEntryModule.__mocks.getPublicNewsletterBySlug.mockResolvedValue({
      id: 'entry-1',
      organizationId: 'org-1',
      siteId: 'site-1',
      kind: 'newsletter',
      source: 'native',
      status: 'published',
      slug: 'march-update',
      title: 'March Update',
      excerpt: 'Highlights from March.',
      body: 'Body fallback should not be used.',
      bodyHtml: '<p>Highlights from March.</p>',
      seo: {},
      createdAt: '2026-03-02T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      publishedAt: '2026-03-02T00:00:00.000Z',
    });

    const site = {
      ...baseSite,
      publishedContent: {
        ...baseSite.publishedContent,
        pages: [
          {
            id: 'page-newsletters-detail',
            slug: 'newsletter-detail',
            name: 'Newsletter Detail',
            isHomepage: false,
            pageType: 'collectionDetail',
            collection: 'newsletters',
            routePattern: '/newsletters/:slug',
            sections: [
              {
                id: 'section-1',
                name: 'Newsletter detail section',
                components: [],
              },
            ],
            seo: {},
          },
        ],
      },
    };

    const html = await service.renderSitePage(site as never, '/newsletters/march-update');

    expect(html).toContain('March Update');
    expect(html).toContain('<p>Highlights from March.</p>');
  });

  it('sanitizes unsafe newsletter body HTML before rendering', async () => {
    websiteEntryModule.__mocks.getPublicNewsletterBySlug.mockResolvedValue({
      id: 'entry-2',
      organizationId: 'org-1',
      siteId: 'site-1',
      kind: 'newsletter',
      source: 'native',
      status: 'published',
      slug: 'security-update',
      title: 'Security Update',
      excerpt: 'A security-focused newsletter.',
      body: 'Fallback body',
      bodyHtml:
        '<div><p>Safe content</p><script>alert(1)</script><a href="javascript:alert(2)" target="_blank">Bad link</a><img src="data:text/html,<svg onload=alert(3)>"><iframe src="https://evil.example"></iframe></div>',
      seo: {},
      createdAt: '2026-03-02T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      publishedAt: '2026-03-02T00:00:00.000Z',
    });

    const site = {
      ...baseSite,
      publishedContent: {
        ...baseSite.publishedContent,
        pages: [
          {
            id: 'page-newsletters-detail',
            slug: 'newsletter-detail',
            name: 'Newsletter Detail',
            isHomepage: false,
            pageType: 'collectionDetail',
            collection: 'newsletters',
            routePattern: '/newsletters/:slug',
            sections: [
              {
                id: 'section-1',
                name: 'Newsletter detail section',
                components: [],
              },
            ],
            seo: {},
          },
        ],
      },
    };

    const html = await service.renderSitePage(site as never, '/newsletters/security-update');

    expect(html).toContain('Safe content');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('javascript:alert(2)');
    expect(html).not.toContain('data:text/html');
    expect(html).not.toContain('<iframe');
  });

  it('includes redirect handling for recurring donation checkout responses in the public form runtime', () => {
    expect(buildPublicFormRuntimeScript()).toContain('window.location.assign(result.redirectUrl)');
  });
});
