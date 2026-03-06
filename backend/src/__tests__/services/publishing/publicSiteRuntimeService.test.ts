import type { Pool } from 'pg';
import { PublicSiteRuntimeService } from '@services/publishing/publicSiteRuntimeService';

jest.mock('@services/eventService', () => ({
  __mocks: {
    listPublicEventsByOwner: jest.fn(),
    getPublicEventBySlug: jest.fn(),
  },
  EventService: jest.fn().mockImplementation(function EventServiceMock() {
    const module = jest.requireMock('@services/eventService') as {
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

const eventServiceModule = jest.requireMock('@services/eventService') as {
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
    service = new PublicSiteRuntimeService({ query: jest.fn() } as unknown as Pool);
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
});
