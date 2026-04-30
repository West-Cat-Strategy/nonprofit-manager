import type { PublishedPage, PublishedSite, PublishedTheme } from '@app-types/publishing';
import { PublicSiteRenderer } from '@modules/publishing/services/publicSiteRuntime/renderer';
import { PublicSiteRouteResolver } from '@modules/publishing/services/publicSiteRuntime/routeResolver';

const theme: PublishedTheme = {
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
};

const buildPage = (): PublishedPage => ({
  id: 'page-contact',
  slug: 'contact',
  name: 'Contact',
  isHomepage: false,
  pageType: 'static',
  routePattern: '/contact',
  seo: {
    title: 'Contact and Referral',
    description: 'Reach the team, send a referral, or ask about services.',
  },
  sections: [
    {
      id: 'contact-forms',
      name: 'Forms',
      components: [
        {
          id: 'contact-forms-columns',
          type: 'columns',
          gap: '1rem',
          columns: [
            {
              id: 'contact-form-col',
              width: '1/2',
              components: [
                {
                  id: 'contact-form-block',
                  type: 'contact-form',
                  submitText: 'Send message',
                  includePhone: true,
                  includeMessage: true,
                },
              ],
            },
            {
              id: 'referral-form-col',
              width: '1/2',
              components: [
                {
                  id: 'referral-form-block',
                  type: 'referral-form',
                  submitText: 'Submit referral',
                  includePhone: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const buildSite = (page: PublishedPage): PublishedSite =>
  ({
    id: 'site-1',
    userId: 'user-1',
    ownerUserId: 'user-1',
    organizationId: 'org-1',
    siteKind: 'website',
    parentSiteId: null,
    migrationStatus: 'complete',
    templateId: 'template-1',
    name: 'Renderer Test Site',
    subdomain: null,
    customDomain: 'renderer-test.localhost',
    sslEnabled: false,
    sslCertificateExpiresAt: null,
    status: 'published',
    publishedVersion: 'v1',
    publishedAt: new Date('2026-04-19T00:00:00.000Z'),
    analyticsEnabled: true,
    createdAt: new Date('2026-04-19T00:00:00.000Z'),
    updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    publishedContent: {
      templateId: 'template-1',
      templateName: 'Renderer Template',
      theme,
      pages: [page],
      navigation: {
        items: [],
        style: 'horizontal',
        sticky: false,
        transparent: false,
      },
      footer: {
        columns: [],
        copyright: 'Copyright',
      },
      seoDefaults: {
        title: 'Renderer Template',
        description: 'Renderer test site',
      },
      publishedAt: '2026-04-19T00:00:00.000Z',
      version: 'v1',
    },
  }) as PublishedSite;

describe('PublicSiteRenderer', () => {
  it('renders nested public forms inside columns with runtime bindings', async () => {
    const page = buildPage();
    const site = buildSite(page);
    const renderer = new PublicSiteRenderer(
      { listPublicEventsByOwner: jest.fn() } as never,
      { listPublicNewsletters: jest.fn() } as never,
      new PublicSiteRouteResolver()
    );

    const html = await renderer.renderPage(site, page, { kind: 'static' });

    expect(html).toContain('action="/api/v2/public/forms/site-1/contact-form-block/submit"');
    expect(html).toContain('action="/api/v2/public/forms/site-1/referral-form-block/submit"');
    expect(html).toContain('name="subject"');
    expect(html).toContain('data-public-site-form="true"');
    expect((html.match(/action="\/api\/v2\/public\/forms\/site-1\//g) || []).length).toBe(2);
    expect(html).not.toContain('Unknown component type: referral-form');
  });

  it('renders event registration forms against the public events registration endpoint', async () => {
    const page: PublishedPage = {
      id: 'page-event-detail',
      slug: 'events',
      name: 'Event Detail',
      isHomepage: false,
      pageType: 'collectionDetail',
      collection: 'events',
      routePattern: '/events/:slug',
      seo: {
        title: 'Event Detail',
        description: 'Register for an event.',
      },
      sections: [
        {
          id: 'event-registration',
          name: 'Registration',
          components: [
            {
              id: 'event-registration-block',
              type: 'event-registration',
              submitText: 'Reserve a seat',
            },
          ],
        },
      ],
    } as PublishedPage;
    const site = buildSite(page);
    const renderer = new PublicSiteRenderer(
      { listPublicEventsByOwner: jest.fn() } as never,
      { listPublicNewsletters: jest.fn() } as never,
      new PublicSiteRouteResolver()
    );

    const html = await renderer.renderPage(site, page, {
      kind: 'eventDetail',
      detailPathPattern: '/events/:slug',
      event: {
        event_id: 'event-42',
        event_name: 'Community fair',
        description: null,
        event_type: 'workshop',
        status: 'published',
        start_date: new Date('2026-05-01T12:00:00.000Z'),
        end_date: new Date('2026-05-01T13:00:00.000Z'),
        location_name: null,
        city: null,
        state_province: null,
        country: null,
        capacity: null,
        registered_count: 0,
        waitlist_enabled: false,
        occurrence_count: 0,
        next_occurrence_id: null,
        next_occurrence_start_date: null,
        next_occurrence_end_date: null,
        next_occurrence_status: null,
        address_line1: null,
        address_line2: null,
        postal_code: null,
        default_occurrence_id: null,
        occurrences: [],
        is_registration_open: true,
      } as never,
    });

    expect(html).toContain(
      'action="/api/v2/public/events/event-42/registrations?site=site-1"'
    );
    expect(html).toContain('<h1>Community fair</h1>');
    expect(html).toContain('Reserve a seat');
    expect(html).not.toContain('/api/v2/public/forms/site-1/event-registration-block/submit');
  });
});
