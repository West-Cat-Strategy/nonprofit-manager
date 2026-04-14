import type { Pool } from 'pg';
import { PublicWebsiteFormService } from '@services/publishing/publicWebsiteFormService';
import { paymentProviderService } from '@services/paymentProviderService';

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
      getPublicSiteByIdForPreview: module.__mocks.getPublicSiteById,
      getSiteBySubdomain: module.__mocks.getSiteBySubdomain,
      getSiteBySubdomainForPreview: module.__mocks.getSiteBySubdomain,
      getSiteByDomain: module.__mocks.getSiteByDomain,
      getSiteByDomainForPreview: module.__mocks.getSiteByDomain,
    };
  }),
}));

jest.mock('@container/services', () => ({
  __mocks: {
    createContact: jest.fn(),
    createVolunteer: jest.fn(),
    createDonation: jest.fn(),
    createPublicCheckoutPlan: jest.fn(),
    createCase: jest.fn(),
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
    recurringDonation: {
      createPublicCheckoutPlan: (...args: unknown[]) => {
        const module = jest.requireMock('@container/services') as {
          __mocks: {
            createPublicCheckoutPlan: jest.Mock;
          };
        };

        return module.__mocks.createPublicCheckoutPlan(...args);
      },
    },
    case: {
      createCase: (...args: unknown[]) => {
        const module = jest.requireMock('@container/services') as {
          __mocks: {
            createCase: jest.Mock;
          };
        };

        return module.__mocks.createCase(...args);
      },
    },
  },
}));

jest.mock('@services/paymentProviderService', () => ({
  __esModule: true,
  paymentProviderService: {
    isProviderConfigured: jest.fn(),
    createPaymentIntent: jest.fn(),
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

jest.mock('@services/newsletterProviderService', () => ({
  __esModule: true,
  default: {
    resolveNewsletterProvider: jest.fn(),
    syncNewsletterContact: jest.fn(),
  },
}));

jest.mock('@services/publishing/publicSubmissionService', () => ({
  __mocks: {
    beginSubmission: jest.fn(),
    markAccepted: jest.fn(),
    markRejected: jest.fn(),
  },
  PublicSubmissionConflictError: class PublicSubmissionConflictError extends Error { },
  PublicSubmissionReplayError: class PublicSubmissionReplayError extends Error {
    constructor(message: string, public readonly idempotentReplay: boolean = false) {
      super(message);
    }
  },
  publicSubmissionService: {
    beginSubmission: (...args: unknown[]) => {
      const module = jest.requireMock('@services/publishing/publicSubmissionService') as {
        __mocks: { beginSubmission: jest.Mock };
      };
      return module.__mocks.beginSubmission(...args);
    },
    markAccepted: (...args: unknown[]) => {
      const module = jest.requireMock('@services/publishing/publicSubmissionService') as {
        __mocks: { markAccepted: jest.Mock };
      };
      return module.__mocks.markAccepted(...args);
    },
    markRejected: (...args: unknown[]) => {
      const module = jest.requireMock('@services/publishing/publicSubmissionService') as {
        __mocks: { markRejected: jest.Mock };
      };
      return module.__mocks.markRejected(...args);
    },
  },
}));

jest.mock('@services/activityEventService', () => ({
  __mocks: {
    recordEvent: jest.fn(),
  },
  activityEventService: {
    recordEvent: (...args: unknown[]) => {
      const module = jest.requireMock('@services/activityEventService') as {
        __mocks: { recordEvent: jest.Mock };
      };
      return module.__mocks.recordEvent(...args);
    },
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
    createPublicCheckoutPlan: jest.Mock;
    createCase: jest.Mock;
  };
};

const paymentProviderModule = paymentProviderService as jest.Mocked<typeof paymentProviderService>;

const mailchimpModule = jest.requireMock('@services/mailchimpService') as {
  __mocks: {
    addOrUpdateMember: jest.Mock;
    isMailchimpConfigured: jest.Mock;
  };
};

const newsletterProviderModule = jest.requireMock('@services/newsletterProviderService') as {
  default: {
    resolveNewsletterProvider: jest.Mock;
    syncNewsletterContact: jest.Mock;
  };
};

const publicSubmissionModule = jest.requireMock('@services/publishing/publicSubmissionService') as {
  __mocks: {
    beginSubmission: jest.Mock;
    markAccepted: jest.Mock;
    markRejected: jest.Mock;
  };
};

const activityEventsModule = jest.requireMock('@services/activityEventService') as {
  __mocks: {
    recordEvent: jest.Mock;
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
    servicesModule.__mocks.createPublicCheckoutPlan.mockReset();
    servicesModule.__mocks.createCase.mockReset();
    paymentProviderModule.isProviderConfigured.mockReset();
    paymentProviderModule.createPaymentIntent.mockReset();
    mailchimpModule.__mocks.addOrUpdateMember.mockReset();
    mailchimpModule.__mocks.isMailchimpConfigured.mockReset();
    newsletterProviderModule.default.resolveNewsletterProvider.mockReset();
    newsletterProviderModule.default.syncNewsletterContact.mockReset();
    publicSubmissionModule.__mocks.beginSubmission.mockReset();
    publicSubmissionModule.__mocks.markAccepted.mockReset();
    publicSubmissionModule.__mocks.markRejected.mockReset();
    activityEventsModule.__mocks.recordEvent.mockReset();
    paymentProviderModule.isProviderConfigured.mockReturnValue(false);
    mailchimpModule.__mocks.isMailchimpConfigured.mockReturnValue(false);
    publicSubmissionModule.__mocks.beginSubmission.mockResolvedValue({ submissionId: 'submission-1' });
    publicSubmissionModule.__mocks.markAccepted.mockResolvedValue(undefined);
    publicSubmissionModule.__mocks.markRejected.mockResolvedValue(undefined);
    activityEventsModule.__mocks.recordEvent.mockResolvedValue(undefined);
  });

  it('syncs newsletter signups through Mautic when the provider is set to Mautic', async () => {
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
                    id: 'newsletter-1',
                    type: 'newsletter-signup',
                    defaultTags: ['website'],
                    audienceMode: 'mautic',
                    mauticSegmentId: 'seg-42',
                    successMessage: 'You are in.',
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    servicesModule.__mocks.createContact.mockResolvedValue({ contact_id: 'contact-1' });
    newsletterProviderModule.default.resolveNewsletterProvider.mockReturnValue('mautic');
    newsletterProviderModule.default.syncNewsletterContact.mockResolvedValue({
      contactId: 'contact-1',
      email: 'ada@example.com',
      success: true,
      action: 'added',
    });

    const result = await service.submitForm(site as never, 'newsletter-1', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'Ada@example.com',
    });

    expect(newsletterProviderModule.default.syncNewsletterContact).toHaveBeenCalledWith(
      expect.objectContaining({
        newsletter: expect.any(Object),
      }),
      {
        contactId: 'contact-1',
        listId: 'seg-42',
        tags: ['website', 'newsletter'],
      }
    );
    expect(result).toEqual({
      formType: 'newsletter-signup',
      message: 'You are in.',
      contactId: 'contact-1',
      mailchimpSynced: false,
      newsletterSynced: true,
    });
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
    expect(publicSubmissionModule.__mocks.markAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'submission-1',
        resultEntityType: 'contact',
        resultEntityId: 'contact-1',
      })
    );
    expect(activityEventsModule.__mocks.recordEvent).toHaveBeenCalled();
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

  it('creates a referral intake case for referral forms', async () => {
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
                    id: 'referral-form-1',
                    type: 'referral-form',
                    defaultTags: ['public-site'],
                    successMessage: 'Referral saved.',
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    servicesModule.__mocks.createContact.mockResolvedValue({ contact_id: 'contact-1' });
    servicesModule.__mocks.createCase.mockResolvedValue({ id: 'case-1' });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'case-type-1' }] });

    const result = await service.submitForm(site as never, 'referral-form-1', {
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@example.com',
      phone: '(604) 555-1212',
      subject: 'Housing referral',
      referral_source: 'Community Partner',
      notes: 'Needs support this week.',
      urgent: 'true',
    });

    expect(servicesModule.__mocks.createContact).toHaveBeenCalledWith(
      {
        account_id: 'org-1',
        first_name: 'Grace',
        last_name: 'Hopper',
        email: 'grace@example.com',
        phone: '(604) 555-1212',
        mobile_phone: '(604) 555-1212',
        notes: 'Needs support this week.',
        tags: ['public-site', 'referral', 'intake'],
      },
      'owner-1'
    );
    expect(servicesModule.__mocks.createCase).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'contact-1',
        account_id: 'org-1',
        case_type_id: 'case-type-1',
        title: 'Housing referral',
        description: 'Needs support this week.',
        source: 'referral',
        referral_source: 'Community Partner',
        is_urgent: true,
        client_viewable: false,
      }),
      'owner-1'
    );
    expect(result).toEqual({
      formType: 'referral-form',
      message: 'Referral saved.',
      contactId: 'contact-1',
      caseId: 'case-1',
    });
    expect(publicSubmissionModule.__mocks.markAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        resultEntityType: 'case',
        resultEntityId: 'case-1',
      })
    );
    expect(activityEventsModule.__mocks.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'case',
        entityId: 'case-1',
        relatedEntityType: 'contact',
        relatedEntityId: 'contact-1',
      })
    );
  });

  it('returns stored response payloads on idempotent replay', async () => {
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
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    publicSubmissionModule.__mocks.beginSubmission.mockResolvedValue({
      submissionId: null,
      replayedResponse: {
        formType: 'contact-form',
        message: 'Stored response',
        contactId: 'contact-9',
      },
    });

    const result = await service.submitForm(
      site as never,
      'contact-form-1',
      {
        email: 'ada@example.com',
      },
      {
        idempotencyKey: 'form-1',
      }
    );

    expect(result).toEqual({
      formType: 'contact-form',
      message: 'Stored response',
      contactId: 'contact-9',
      idempotentReplay: true,
    });
    expect(servicesModule.__mocks.createContact).not.toHaveBeenCalled();
    expect(publicSubmissionModule.__mocks.markAccepted).not.toHaveBeenCalled();
    expect(activityEventsModule.__mocks.recordEvent).not.toHaveBeenCalled();
  });

  it('creates a recurring checkout plan instead of a pending donation when monthly giving is selected', async () => {
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
                    id: 'donation-form-1',
                    type: 'donation-form',
                    campaignId: 'monthly-donors',
                    recurringDefault: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    servicesModule.__mocks.createContact.mockResolvedValue({ contact_id: 'contact-1' });
    servicesModule.__mocks.createPublicCheckoutPlan.mockResolvedValue({
      plan: {
        recurring_plan_id: 'plan-1',
        status: 'checkout_pending',
      },
      redirect_url: 'https://checkout.stripe.com/pay/test-session',
      return_url: 'https://site.example.org/donate',
    });
    paymentProviderModule.isProviderConfigured.mockReturnValue(true);

    const result = await service.submitForm(
      site as never,
      'donation-form-1',
      {
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'Ada@example.com',
        amount: '25',
        recurring: 'true',
      },
      {
        pagePath: '/donate',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        referrer: 'https://site.example.org/donate',
        userAgent: 'Mozilla/5.0',
      }
    );

    expect(servicesModule.__mocks.createDonation).not.toHaveBeenCalled();
    expect(servicesModule.__mocks.createPublicCheckoutPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        contactId: 'contact-1',
        siteId: 'site-1',
        formKey: 'donation-form-1',
        donorEmail: 'ada@example.com',
        amount: 25,
        currency: 'CAD',
        campaignName: 'monthly-donors',
        pagePath: '/donate',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        referrer: 'https://site.example.org/donate',
        userAgent: 'Mozilla/5.0',
      })
    );
    expect(result).toEqual({
      formType: 'donation-form',
      message: 'Redirecting you to secure checkout...',
      contactId: 'contact-1',
      recurringPlanId: 'plan-1',
      recurringPlanStatus: 'checkout_pending',
      redirectUrl: 'https://checkout.stripe.com/pay/test-session',
      returnUrl: 'https://site.example.org/donate',
    });
    expect(publicSubmissionModule.__mocks.markAccepted).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'submission-1',
        resultEntityType: 'contact',
        resultEntityId: 'contact-1',
        auditMetadata: expect.objectContaining({
          recurringPlanId: 'plan-1',
        }),
      })
    );
  });

  it('uses the configured donation provider when monthly giving is selected from website settings', async () => {
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
                    id: 'donation-form-1',
                    type: 'donation-form',
                    recurringDefault: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          site_id: 'site-1',
          organization_id: 'org-1',
          newsletter_config: { provider: 'mautic' },
          mailchimp_config: {},
          mautic_config: {},
          stripe_config: { provider: 'paypal' },
          social_config: { facebook: {} },
          form_defaults: {},
          form_overrides: {},
          conversion_tracking: {},
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ],
    });
    servicesModule.__mocks.createContact.mockResolvedValue({ contact_id: 'contact-1' });
    servicesModule.__mocks.createPublicCheckoutPlan.mockResolvedValue({
      plan: {
        recurring_plan_id: 'plan-2',
        status: 'checkout_pending',
      },
      redirect_url: 'https://checkout.example.org/pay/test-session',
      return_url: 'https://site.example.org/donate',
    });
    paymentProviderModule.isProviderConfigured.mockReturnValue(true);

    const result = await service.submitForm(site as never, 'donation-form-1', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'Ada@example.com',
      amount: '25',
      recurring: 'true',
    });

    expect(servicesModule.__mocks.createPublicCheckoutPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'paypal',
        organizationId: 'org-1',
        contactId: 'contact-1',
      })
    );
    expect(result).toEqual({
      formType: 'donation-form',
      message: 'Redirecting you to secure checkout...',
      contactId: 'contact-1',
      recurringPlanId: 'plan-2',
      recurringPlanStatus: 'checkout_pending',
      redirectUrl: 'https://checkout.example.org/pay/test-session',
      returnUrl: 'https://site.example.org/donate',
    });
  });

  it('prefers a donation form provider override over the site default provider', async () => {
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
                    id: 'donation-form-1',
                    type: 'donation-form',
                    provider: 'square',
                    recurringDefault: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          site_id: 'site-1',
          organization_id: 'org-1',
          newsletter_config: { provider: 'mautic' },
          mailchimp_config: {},
          mautic_config: {},
          stripe_config: { provider: 'paypal' },
          social_config: { facebook: {} },
          form_defaults: {},
          form_overrides: {},
          conversion_tracking: {},
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ],
    });
    servicesModule.__mocks.createContact.mockResolvedValue({ contact_id: 'contact-1' });
    servicesModule.__mocks.createPublicCheckoutPlan.mockResolvedValue({
      plan: {
        recurring_plan_id: 'plan-3',
        status: 'checkout_pending',
      },
      redirect_url: 'https://checkout.example.org/pay/test-session',
      return_url: 'https://site.example.org/donate',
    });
    paymentProviderModule.isProviderConfigured.mockReturnValue(true);

    await service.submitForm(site as never, 'donation-form-1', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'Ada@example.com',
      amount: '25',
      recurring: 'true',
    });

    expect(servicesModule.__mocks.createPublicCheckoutPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'square',
      })
    );
  });
});
