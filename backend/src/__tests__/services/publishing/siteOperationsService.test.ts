import type { Pool } from 'pg';
import type {
  PublishedSite,
  WebsiteFormDefinition,
  WebsiteSiteSettings,
} from '@app-types/publishing';
import { SiteOperationsService } from '@services/publishing/siteOperationsService';

const buildSite = (): PublishedSite => ({
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
});

const buildSettings = (): WebsiteSiteSettings => ({
  siteId: 'site-1',
  organizationId: 'org-1',
  mailchimp: {},
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

const buildForm = (
  overrides: Partial<WebsiteFormDefinition> = {}
): WebsiteFormDefinition => ({
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
  ...overrides,
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
    mockFormRegistry.extract.mockReturnValue([buildForm()]);

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
      .mockReturnValueOnce([buildForm()])
      .mockReturnValueOnce([
        buildForm({
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
});
