import type { Pool } from 'pg';
import type {
  PublishedSite,
  WebsiteFormDefinition,
  WebsiteSiteSettings,
} from '@app-types/publishing';
import { SiteOperationsService } from '@services/publishing/siteOperationsService';

const buildSite = (overrides: Partial<PublishedSite> = {}): PublishedSite => ({
  id: 'site-1',
  userId: 'user-1',
  ownerUserId: 'owner-1',
  organizationId: 'org-1',
  siteKind: 'organization',
  parentSiteId: null,
  migrationStatus: 'complete',
  templateId: 'template-1',
  name: 'Site One',
  subdomain: 'site-one',
  customDomain: null,
  sslEnabled: false,
  sslCertificateExpiresAt: null,
  status: 'draft',
  publishedVersion: null,
  publishedAt: null,
  publishedContent: { pages: [] } as PublishedSite['publishedContent'],
  analyticsEnabled: true,
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
});

const buildManagedForm = (overrides: Partial<WebsiteFormDefinition> = {}): WebsiteFormDefinition => ({
  formKey: 'contact-form-1',
  componentId: 'contact-form-1',
  formType: 'contact-form',
  title: 'Contact form',
  description: 'Stay in touch',
  pageId: 'page-home',
  pageName: 'Home',
  pageSlug: 'home',
  pageType: 'static',
  routePattern: '/',
  path: '/',
  live: true,
  blocked: false,
  sourceConfig: {},
  operationalSettings: {
    successMessage: 'Original message',
  },
  publicRuntime: {
    siteKey: 'site-1',
    publicPath: '/',
    publicUrl: 'https://site-one.example.com',
    previewUrl: 'https://site-one.example.com?preview=true&version=v1',
    submissionPath: '/api/v2/public/forms/site-1/contact-form-1/submit',
  },
  ...overrides,
});

const buildSettings = (): WebsiteSiteSettings => ({
  siteId: 'site-1',
  organizationId: 'org-1',
  newsletter: {
    provider: 'mautic',
  },
  mailchimp: {},
  mautic: {},
  stripe: {},
  formDefaults: {},
  formOverrides: {},
  conversionTracking: {
    enabled: true,
    events: {
      formSubmit: true,
      donation: true,
      eventRegister: true,
    },
  },
  createdAt: null,
  updatedAt: null,
});

describe('SiteOperationsService', () => {
  let mockQuery: jest.Mock;
  let service: SiteOperationsService;
  let mockSiteManagement: { getSite: jest.Mock };
  let mockSiteSettings: {
    getSettingsForSite: jest.Mock;
    updateFormOverride: jest.Mock;
  };
  let mockFormRegistry: { extract: jest.Mock };

  beforeEach(() => {
    mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    service = new SiteOperationsService({ query: mockQuery } as unknown as Pool);

    mockSiteManagement = {
      getSite: jest.fn().mockResolvedValue(buildSite()),
      getSiteUrl: jest.fn().mockReturnValue('https://site-one.example.com'),
    };
    mockSiteSettings = {
      getSettingsForSite: jest.fn().mockResolvedValue(buildSettings()),
      updateFormOverride: jest.fn().mockResolvedValue(buildSettings()),
    };
    mockFormRegistry = {
      extract: jest.fn(),
    };

    (service as unknown as { siteManagement: typeof mockSiteManagement }).siteManagement =
      mockSiteManagement;
    (service as unknown as { siteSettings: typeof mockSiteSettings }).siteSettings =
      mockSiteSettings;
    (service as unknown as { formRegistry: typeof mockFormRegistry }).formRegistry = mockFormRegistry;
  });

  it('rejects unknown form keys before persisting overrides', async () => {
    mockFormRegistry.extract.mockReturnValue([buildManagedForm()]);

    await expect(
      service.updateForm(
        'site-1',
        'missing-form',
        { successMessage: 'Should not save' },
        'user-1',
        'org-1'
      )
    ).rejects.toThrow('Website form not found');

    expect(mockSiteSettings.updateFormOverride).not.toHaveBeenCalled();
  });

  it('persists valid form overrides and returns the refreshed form definition', async () => {
    mockFormRegistry.extract
      .mockReturnValueOnce([buildManagedForm()])
      .mockReturnValueOnce([
        buildManagedForm({
          operationalSettings: {
            successMessage: 'Updated by site console',
            defaultTags: ['console-updated'],
          },
        }),
      ]);

    const result = await service.updateForm(
      'site-1',
      'contact-form-1',
      {
        successMessage: 'Updated by site console',
        defaultTags: ['console-updated'],
      },
      'user-1',
      'org-1'
    );

    expect(mockSiteSettings.updateFormOverride).toHaveBeenCalledWith(
      'site-1',
      'contact-form-1',
      {
        successMessage: 'Updated by site console',
        defaultTags: ['console-updated'],
      },
      'user-1',
      'org-1'
    );
    expect(result).toMatchObject({
      formKey: 'contact-form-1',
      operationalSettings: {
        successMessage: 'Updated by site console',
        defaultTags: ['console-updated'],
      },
    });
  });

  it('passes live and preview runtime URLs into the form registry', async () => {
    mockSiteManagement.getSite.mockResolvedValue(
      buildSite({
        status: 'published',
        publishedVersion: 'v-live-1',
        publishedContent: {
          pages: [
            {
              id: 'page-home',
              name: 'Home',
              slug: 'home',
              isHomepage: true,
              pageType: 'static',
              routePattern: '/',
              sections: [],
              seo: {},
            },
          ],
        } as PublishedSite['publishedContent'],
      })
    );
    mockFormRegistry.extract.mockReturnValue([buildManagedForm()]);
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ version: 'preview-v-2' }] });

    await service.getForms('site-1', 'user-1', 'org-1');

    const extractedPages = mockFormRegistry.extract.mock.calls[0]?.[0] as Array<{
      collection?: string;
      pageType?: string;
      routePattern?: string;
      sections?: Array<{ components?: Array<{ type?: string }> }>;
    }>;
    const eventDetailPage = extractedPages.find(
      (page) => page.collection === 'events' && page.pageType === 'collectionDetail'
    );
    expect(eventDetailPage).toMatchObject({
      routePattern: '/events/:slug',
    });
    expect(
      eventDetailPage?.sections?.flatMap((section) =>
        (section.components || []).map((component) => component.type)
      )
    ).toEqual(expect.arrayContaining(['event-detail', 'event-registration']));
    expect(mockFormRegistry.extract).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object),
      expect.any(Array),
      false,
      {
        siteKey: 'site-1',
        liveBaseUrl: 'https://site-one.example.com',
        livePreviewBaseUrl: 'https://site-one.example.com?preview=true&version=v-live-1',
        previewBaseUrl: 'https://site-one.example.com?preview=true&version=preview-v-2',
      }
    );
  });

  it('returns a management snapshot with readiness and the next operator action', async () => {
    const site = buildSite({
      publishedContent: {
        templateId: 'template-1',
        templateName: 'Community Template',
        theme: {} as any,
        pages: [
          {
            id: 'page-home',
            slug: 'home',
            name: 'Home',
            isHomepage: true,
            sections: [],
            seo: { title: 'Home' },
          } as any,
        ],
        navigation: { items: [], style: 'horizontal', sticky: false, transparent: false },
        footer: { columns: [], copyright: 'Copyright' },
        seoDefaults: { title: 'Site', description: 'Desc' },
        publishedAt: '2026-03-01T00:00:00.000Z',
        version: 'v1',
      } as PublishedSite['publishedContent'],
    });

    mockSiteManagement.getSite.mockResolvedValue(site);
    mockFormRegistry.extract.mockReturnValue([buildManagedForm({ formType: 'newsletter-signup' })]);
    mockSiteSettings.getSettingsForSite.mockResolvedValue(buildSettings());

    (service as unknown as { getForms: jest.Mock }).getForms = jest.fn().mockResolvedValue([
      buildManagedForm({ formType: 'newsletter-signup' }),
      buildManagedForm({
        formType: 'donation-form',
        formKey: 'donation-form-1',
        componentId: 'donation-form-1',
        title: 'Donation form',
      }),
    ]);
    (service as unknown as { getConversionMetrics: jest.Mock }).getConversionMetrics = jest
      .fn()
      .mockResolvedValue({
        totalPageviews: 100,
        uniqueVisitors: 50,
        formSubmissions: 12,
        eventRegistrations: 0,
        donations: 1,
        totalConversions: 13,
        periodStart: '2026-02-01T00:00:00.000Z',
        periodEnd: '2026-03-01T00:00:00.000Z',
        recentConversions: [],
      });
    (service as unknown as { getIntegrationStatus: jest.Mock }).getIntegrationStatus = jest
      .fn()
      .mockResolvedValue({
      blocked: false,
      publishStatus: 'draft',
      newsletter: {
        provider: 'mautic',
        configured: false,
        lastSyncAt: null,
      },
      mailchimp: {
        configured: false,
        availableAudiences: [],
        lastSyncAt: null,
      },
      mautic: {
        configured: false,
        availableAudiences: [],
        lastSyncAt: null,
      },
      stripe: {
        configured: false,
        publishableKeyConfigured: false,
      },
        social: {
          facebook: {
            lastSyncAt: null,
            lastSyncError: null,
          },
        },
      });

    const result = await service.getOverview('site-1', 'user-1', 30, 'org-1');

    expect(result.site.managementSummary?.status).toBe('attention');
    expect(result.site.managementSummary?.readiness.publish).toBe(false);
    expect(result.site.managementSummary?.nextAction.href).toBe('/websites/site-1/publishing');
    expect(result.managementSnapshot.status).toBe('attention');
    expect(result.managementSnapshot.readiness.publish).toBe(true);
    expect(result.managementSnapshot.readiness.forms).toBe(true);
    expect(result.managementSnapshot.readiness.integrations).toBe(false);
    expect(result.managementSnapshot.nextAction.href).toBe('/websites/site-1/integrations');
    expect(result.managementSnapshot.attentionItems.map((item) => item.id)).toEqual(
      expect.arrayContaining(['newsletter', 'stripe'])
    );
    expect(result.managementSnapshot.signals.forms).toBe(2);
  });
});
