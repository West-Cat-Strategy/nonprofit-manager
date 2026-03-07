import type { Pool } from 'pg';
import { PublicWebsiteFormService } from '@services/publishing/publicWebsiteFormService';

jest.mock('@services/publishing/siteManagementService', () => ({
  __mocks: {
    getPublicSiteById: jest.fn(),
    getSiteBySubdomain: jest.fn(),
    getSiteByDomain: jest.fn(),
  },
  SiteManagementService: jest.fn().mockImplementation(function SiteManagementServiceMock() {
    const module = jest.requireMock('@services/publishing/siteManagementService') as {
      __mocks: {
        getPublicSiteById: jest.Mock;
        getSiteBySubdomain: jest.Mock;
        getSiteByDomain: jest.Mock;
      };
    };

    return {
      getPublicSiteById: module.__mocks.getPublicSiteById,
      getSiteBySubdomain: module.__mocks.getSiteBySubdomain,
      getSiteByDomain: module.__mocks.getSiteByDomain,
    };
  }),
}));

jest.mock('@container/services', () => ({
  __mocks: {
    createContact: jest.fn(),
    createVolunteer: jest.fn(),
    createDonation: jest.fn(),
  },
  services: {
    contact: {
      createContact: (...args: unknown[]) => {
        const module = jest.requireMock('@container/services') as {
          __mocks: {
            createContact: jest.Mock;
          };
        };

        return module.__mocks.createContact(...args);
      },
    },
    volunteer: {
      createVolunteer: (...args: unknown[]) => {
        const module = jest.requireMock('@container/services') as {
          __mocks: {
            createVolunteer: jest.Mock;
          };
        };

        return module.__mocks.createVolunteer(...args);
      },
    },
    donation: {
      createDonation: (...args: unknown[]) => {
        const module = jest.requireMock('@container/services') as {
          __mocks: {
            createDonation: jest.Mock;
          };
        };

        return module.__mocks.createDonation(...args);
      },
    },
  },
}));

jest.mock('@services/domains/operations', () => ({
  __mocks: {
    isStripeConfigured: jest.fn(),
    createPaymentIntent: jest.fn(),
  },
  stripeService: {
    isStripeConfigured: () => {
      const module = jest.requireMock('@services/domains/operations') as {
        __mocks: {
          isStripeConfigured: jest.Mock;
        };
      };

      return module.__mocks.isStripeConfigured();
    },
    createPaymentIntent: (...args: unknown[]) => {
      const module = jest.requireMock('@services/domains/operations') as {
        __mocks: {
          createPaymentIntent: jest.Mock;
        };
      };

      return module.__mocks.createPaymentIntent(...args);
    },
  },
}));

jest.mock('@services/mailchimpService', () => ({
  __mocks: {
    addOrUpdateMember: jest.fn(),
    isMailchimpConfigured: jest.fn(),
  },
  addOrUpdateMember: (...args: unknown[]) => {
    const module = jest.requireMock('@services/mailchimpService') as {
      __mocks: {
        addOrUpdateMember: jest.Mock;
      };
    };

    return module.__mocks.addOrUpdateMember(...args);
  },
  isMailchimpConfigured: () => {
    const module = jest.requireMock('@services/mailchimpService') as {
      __mocks: {
        isMailchimpConfigured: jest.Mock;
      };
    };

    return module.__mocks.isMailchimpConfigured();
  },
}));

const siteManagementModule = jest.requireMock('@services/publishing/siteManagementService') as {
  __mocks: {
    getPublicSiteById: jest.Mock;
    getSiteBySubdomain: jest.Mock;
    getSiteByDomain: jest.Mock;
  };
};

const servicesModule = jest.requireMock('@container/services') as {
  __mocks: {
    createContact: jest.Mock;
    createVolunteer: jest.Mock;
    createDonation: jest.Mock;
  };
};

const operationsModule = jest.requireMock('@services/domains/operations') as {
  __mocks: {
    isStripeConfigured: jest.Mock;
    createPaymentIntent: jest.Mock;
  };
};

const mailchimpModule = jest.requireMock('@services/mailchimpService') as {
  __mocks: {
    addOrUpdateMember: jest.Mock;
    isMailchimpConfigured: jest.Mock;
  };
};

describe('PublicWebsiteFormService', () => {
  const baseSite = {
    id: 'site-1',
    userId: 'user-1',
    ownerUserId: 'owner-1',
    organizationId: 'org-1',
    siteKind: 'organization',
    parentSiteId: null,
    migrationStatus: 'complete',
    name: 'Neighborhood Mutual Aid',
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
      pages: [
        {
          id: 'page-1',
          slug: 'support',
          name: 'Support',
          isHomepage: false,
          sections: [
            {
              id: 'section-1',
              name: 'Forms',
              components: [],
            },
          ],
          seo: {},
        },
      ],
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
        title: 'Neighborhood Mutual Aid',
        description: 'Community support',
      },
      publishedAt: '2026-03-01T00:00:00.000Z',
      version: 'v1',
    },
  };

  let pool: Pool;
  let mockQuery: jest.Mock;
  let service: PublicWebsiteFormService;

  beforeEach(() => {
    mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    pool = { query: mockQuery } as unknown as Pool;
    service = new PublicWebsiteFormService(pool);

    siteManagementModule.__mocks.getPublicSiteById.mockReset();
    siteManagementModule.__mocks.getSiteBySubdomain.mockReset();
    siteManagementModule.__mocks.getSiteByDomain.mockReset();
    servicesModule.__mocks.createContact.mockReset();
    servicesModule.__mocks.createVolunteer.mockReset();
    servicesModule.__mocks.createDonation.mockReset();
    operationsModule.__mocks.isStripeConfigured.mockReset();
    operationsModule.__mocks.createPaymentIntent.mockReset();
    mailchimpModule.__mocks.addOrUpdateMember.mockReset();
    mailchimpModule.__mocks.isMailchimpConfigured.mockReset();
    operationsModule.__mocks.isStripeConfigured.mockReturnValue(false);
    mailchimpModule.__mocks.isMailchimpConfigured.mockReturnValue(false);
  });

  it('resolves site keys by UUID before falling back to host keys', async () => {
    siteManagementModule.__mocks.getPublicSiteById.mockResolvedValue(baseSite);

    const resolved = await service.resolveSiteByKey('11111111-1111-4111-8111-111111111111');

    expect(resolved).toBe(baseSite);
    expect(siteManagementModule.__mocks.getPublicSiteById).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111'
    );
    expect(siteManagementModule.__mocks.getSiteBySubdomain).not.toHaveBeenCalled();
    expect(siteManagementModule.__mocks.getSiteByDomain).not.toHaveBeenCalled();
  });

  it('falls back from subdomain lookup to custom domain lookup', async () => {
    siteManagementModule.__mocks.getSiteBySubdomain.mockResolvedValue(null);
    siteManagementModule.__mocks.getSiteByDomain.mockResolvedValue(baseSite);

    const resolved = await service.resolveSiteByKey('campaign.example.org');

    expect(resolved).toBe(baseSite);
    expect(siteManagementModule.__mocks.getSiteBySubdomain).toHaveBeenCalledWith(
      'campaign.example.org'
    );
    expect(siteManagementModule.__mocks.getSiteByDomain).toHaveBeenCalledWith(
      'campaign.example.org'
    );
  });

  it('submits contact forms by creating nonprofit contacts with merged tags', async () => {
    const site = {
      ...baseSite,
      publishedContent: {
        ...baseSite.publishedContent,
        pages: [
          {
            ...baseSite.publishedContent.pages[0],
            sections: [
              {
                id: 'section-1',
                name: 'Forms',
                components: [
                  {
                    id: 'contact-form-1',
                    type: 'contact-form',
                    formMode: 'supporter',
                    defaultTags: ['community'],
                    successMessage: 'We have your note.',
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    servicesModule.__mocks.createContact.mockResolvedValue({ contact_id: 'contact-1' });

    const result = await service.submitForm(site as never, 'contact-form-1', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'Ada@example.com',
      message: 'Count me in.',
    });

    expect(servicesModule.__mocks.createContact).toHaveBeenCalledWith(
      {
        account_id: 'org-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        phone: undefined,
        mobile_phone: undefined,
        notes: 'Count me in.',
        tags: ['community', 'supporter'],
      },
      'owner-1'
    );
    expect(result).toEqual({
      formType: 'contact-form',
      message: 'We have your note.',
      contactId: 'contact-1',
    });
  });

  it('rejects components that are not supported form blocks', async () => {
    const site = {
      ...baseSite,
      publishedContent: {
        ...baseSite.publishedContent,
        pages: [
          {
            ...baseSite.publishedContent.pages[0],
            sections: [
              {
                id: 'section-1',
                name: 'Forms',
                components: [
                  {
                    id: 'hero-1',
                    type: 'hero',
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    await expect(service.submitForm(site as never, 'hero-1', {})).rejects.toThrow(
      'Unsupported website form type'
    );
  });
});
