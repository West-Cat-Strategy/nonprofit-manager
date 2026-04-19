import { describe, expect, it } from 'vitest';
import reducer, {
  fetchWebsiteAnalytics,
  fetchWebsiteForms,
  fetchWebsiteIntegrations,
  fetchWebsiteOverview,
  refreshWebsiteNewsletterWorkspace,
  updateWebsiteForm,
  updateWebsiteNewsletterIntegration,
} from '../websitesCore';
import {
  selectWebsiteAnalytics,
  selectWebsiteForms,
  selectWebsiteIntegrations,
} from '../websitesSelectors';

const overviewPayload = {
  site: {
    id: 'site-1',
    templateId: 'template-1',
    templateName: 'Advocacy',
    templateStatus: 'published',
    organizationId: null,
    organizationName: null,
    siteKind: 'organization',
    migrationStatus: 'complete',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    subdomain: 'mutual-aid',
    customDomain: null,
    sslEnabled: true,
    sslCertificateExpiresAt: null,
    publishedVersion: 'v1',
    publishedAt: '2026-04-10T00:00:00.000Z',
    primaryUrl: 'https://example.org',
    previewUrl: 'https://preview.example.org',
    analyticsEnabled: true,
    blocked: false,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  },
  template: {
    id: 'template-1',
    name: 'Advocacy',
    status: 'published',
    updatedAt: '2026-04-09T00:00:00.000Z',
  },
  deployment: {
    primaryUrl: 'https://example.org',
    previewUrl: 'https://preview.example.org',
    domainStatus: 'configured',
    sslStatus: 'active',
  },
  liveRoutes: [],
  draftRoutes: [],
  contentSummary: {
    nativeNewsletters: 1,
    syncedNewsletters: 2,
    publishedNewsletters: 1,
  },
  forms: [
    {
      formKey: 'contact-form-1',
      componentId: 'contact-form-1',
      formType: 'contact-form',
      title: 'Contact form',
      pageId: 'page-1',
      pageName: 'Home',
      pageSlug: 'home',
      pageType: 'static',
      routePattern: '/',
      path: '/',
      live: true,
      blocked: false,
      sourceConfig: {},
      operationalSettings: {
        heading: 'Talk to us',
      },
    },
  ],
  conversionMetrics: {
    totalPageviews: 120,
    uniqueVisitors: 80,
    formSubmissions: 6,
    eventRegistrations: 2,
    donations: 1,
    totalConversions: 9,
    periodStart: '2026-03-11T00:00:00.000Z',
    periodEnd: '2026-04-10T00:00:00.000Z',
    recentConversions: [],
  },
  integrations: {
    blocked: false,
    publishStatus: 'published',
    newsletter: {
      provider: 'mautic',
      configured: true,
      selectedAudienceId: 'seg-1',
      selectedAudienceName: 'Supporters',
      selectedPresetId: null,
      listPresets: [],
      availableAudiences: [{ id: 'seg-1', name: 'Supporters' }],
      audienceCount: 1,
      lastRefreshedAt: null,
      lastSyncAt: null,
    },
    mailchimp: {
      configured: false,
      availableAudiences: [],
      lastSyncAt: null,
    },
    mautic: {
      configured: true,
      baseUrl: 'https://mautic.example.org',
      segmentId: 'seg-1',
      availableAudiences: [{ id: 'seg-1', name: 'Supporters' }],
      lastSyncAt: null,
    },
    stripe: {
      configured: true,
      publishableKeyConfigured: true,
      currency: 'cad',
    },
    social: {
      facebook: {
        lastSyncAt: null,
        lastSyncError: null,
      },
    },
  },
  settings: {
    siteId: 'site-1',
    organizationId: null,
    newsletter: {
      provider: 'mautic',
    },
    mailchimp: {},
    mautic: {},
    stripe: {},
    social: {
      facebook: {},
    },
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
  },
};

const updatedForms = [
  {
    ...overviewPayload.forms[0],
    operationalSettings: {
      heading: 'Reach out today',
    },
  },
];

const updatedIntegrations = {
  ...overviewPayload.integrations,
  stripe: {
    ...overviewPayload.integrations.stripe,
    accountId: 'acct_123',
  },
};

const updatedAnalytics = {
  ...overviewPayload.conversionMetrics,
  totalConversions: 12,
};

describe('website selectors', () => {
  it('hydrates selector data from the overview payload and keeps it in a single current-site cache', () => {
    const state = reducer(
      undefined,
      fetchWebsiteOverview.fulfilled(overviewPayload, 'req-1', { siteId: 'site-1', period: 30 })
    );

    expect(selectWebsiteForms({ websites: state })).toEqual(overviewPayload.forms);
    expect(selectWebsiteIntegrations({ websites: state })).toEqual(overviewPayload.integrations);
    expect(selectWebsiteAnalytics({ websites: state })).toEqual(overviewPayload.conversionMetrics);
    expect('forms' in state).toBe(false);
    expect('integrations' in state).toBe(false);
    expect('analytics' in state).toBe(false);
  });

  it('keeps selector results current when resource fetches update only the current-site cache', () => {
    let state = reducer(
      undefined,
      fetchWebsiteOverview.fulfilled(overviewPayload, 'req-1', { siteId: 'site-1', period: 30 })
    );

    state = reducer(state, fetchWebsiteForms.fulfilled(updatedForms, 'req-2', 'site-1'));
    state = reducer(
      state,
      fetchWebsiteIntegrations.fulfilled(updatedIntegrations, 'req-3', 'site-1')
    );
    state = reducer(
      state,
      fetchWebsiteAnalytics.fulfilled(updatedAnalytics, 'req-4', {
        siteId: 'site-1',
        period: 30,
      })
    );

    expect(selectWebsiteForms({ websites: state })).toEqual(updatedForms);
    expect(selectWebsiteIntegrations({ websites: state })).toEqual(updatedIntegrations);
    expect(selectWebsiteAnalytics({ websites: state })).toEqual(updatedAnalytics);
  });

  it('keeps overview and selectors current after website mutations patch cached resources', () => {
    let state = reducer(
      undefined,
      fetchWebsiteOverview.fulfilled(overviewPayload, 'req-1', { siteId: 'site-1', period: 30 })
    );

    state = reducer(
      state,
      updateWebsiteForm.fulfilled(updatedForms[0], 'req-2', {
        siteId: 'site-1',
        formKey: 'contact-form-1',
        data: {
          heading: 'Reach out today',
        },
      })
    );
    state = reducer(
      state,
      updateWebsiteNewsletterIntegration.fulfilled(updatedIntegrations, 'req-3', {
        siteId: 'site-1',
        data: {
          provider: 'mautic',
        },
      })
    );
    state = reducer(
      state,
      refreshWebsiteNewsletterWorkspace.fulfilled(updatedIntegrations, 'req-4', 'site-1')
    );

    expect(selectWebsiteForms({ websites: state })).toEqual(updatedForms);
    expect(selectWebsiteIntegrations({ websites: state })).toEqual(updatedIntegrations);
    expect(state.overview?.forms).toEqual(updatedForms);
    expect(state.overview?.integrations).toEqual(updatedIntegrations);
  });
});
