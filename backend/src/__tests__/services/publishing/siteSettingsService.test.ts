import type { Pool } from 'pg';
import {
  WebsiteSiteSettingsService,
  mergeManagedComponentConfig,
  mergeWebsiteFormOperationalConfig,
} from '@services/publishing/siteSettingsService';

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

const siteManagementModule = jest.requireMock('@services/publishing/siteManagementService') as {
  __mocks: {
    getSite: jest.Mock;
  };
};

describe('WebsiteSiteSettingsService', () => {
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
  let service: WebsiteSiteSettingsService;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool = { query: mockQuery } as unknown as Pool;
    service = new WebsiteSiteSettingsService(pool);
    siteManagementModule.__mocks.getSite.mockReset();
    siteManagementModule.__mocks.getSite.mockResolvedValue(baseSite);
  });

  it('merges and normalizes Mailchimp settings before persisting', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            site_id: 'site-1',
            organization_id: 'org-1',
            mailchimp_config: {
              audienceId: 'aud-old',
              audienceMode: 'crm',
              defaultTags: ['existing'],
            },
            stripe_config: {},
            form_defaults: {},
            form_overrides: {},
            conversion_tracking: {},
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            site_id: 'site-1',
            organization_id: 'org-1',
            mailchimp_config: {
              audienceId: 'aud-new',
              audienceMode: 'both',
              defaultTags: ['spring', 'donor'],
              syncEnabled: true,
            },
            stripe_config: {},
            form_defaults: {},
            form_overrides: {},
            conversion_tracking: {
              enabled: true,
              events: {
                formSubmit: true,
                donation: true,
                eventRegister: true,
              },
            },
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-06T00:00:00.000Z',
          },
        ],
      });

    const result = await service.updateMailchimpSettings(
      'site-1',
      {
        audienceId: ' aud-new ',
        audienceMode: 'both',
        defaultTags: ['spring', ' donor ', ''],
        syncEnabled: true,
      },
      'user-1',
      'org-1'
    );

    expect(result.mailchimp).toEqual({
      audienceId: 'aud-new',
      audienceMode: 'both',
      defaultTags: ['spring', 'donor'],
      syncEnabled: true,
    });
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[1]?.[1]).toEqual([
      'site-1',
      'org-1',
      JSON.stringify({
        audienceId: 'aud-new',
        audienceMode: 'both',
        defaultTags: ['spring', 'donor'],
        syncEnabled: true,
      }),
      JSON.stringify({}),
      JSON.stringify({
        facebook: {},
      }),
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({
        enabled: true,
        events: {
          formSubmit: true,
          donation: true,
          eventRegister: true,
        },
      }),
      'user-1',
    ]);
  });

  it('blocks settings mutations for sites awaiting organization assignment', async () => {
    siteManagementModule.__mocks.getSite.mockResolvedValue({
      ...baseSite,
      migrationStatus: 'needs_assignment',
    });

    await expect(
      service.updateStripeSettings(
        'site-1',
        { currency: 'usd', recurringDefault: true },
        'user-1',
        'org-1'
      )
    ).rejects.toThrow('Site needs organization assignment before changing website settings');

    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('siteSettings merge helpers', () => {
  const settings = {
    siteId: 'site-1',
    organizationId: 'org-1',
    mailchimp: {
      audienceId: 'aud-1',
    },
    stripe: {
      currency: 'usd',
    },
    formDefaults: {
      successMessage: 'Saved',
      trackingEnabled: true,
      includePhone: true,
    },
    formOverrides: {
      'form-1': {
        buttonText: 'Join now',
        includePhone: false,
      },
    },
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
  };

  it('applies template config, site defaults, and form overrides in precedence order', () => {
    expect(
      mergeWebsiteFormOperationalConfig(
        {
          successMessage: 'Template message',
          submitText: 'Submit',
        },
        settings,
        'form-1'
      )
    ).toEqual({
      successMessage: 'Saved',
      submitText: 'Submit',
      trackingEnabled: true,
      includePhone: false,
      buttonText: 'Join now',
    });
  });

  it('merges managed component config without touching non-managed blocks', () => {
    expect(
      mergeManagedComponentConfig(
        {
          id: 'form-1',
          type: 'newsletter-signup',
          buttonText: 'Subscribe',
        },
        settings
      )
    ).toMatchObject({
      id: 'form-1',
      type: 'newsletter-signup',
      buttonText: 'Join now',
      successMessage: 'Saved',
      trackingEnabled: true,
      includePhone: false,
    });

    expect(
      mergeManagedComponentConfig(
        {
          id: 'hero-1',
          type: 'hero',
          heading: 'Welcome',
        },
        settings
      )
    ).toEqual({
      id: 'hero-1',
      type: 'hero',
      heading: 'Welcome',
    });
  });
});
