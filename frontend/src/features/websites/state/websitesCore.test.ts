import { createNextState } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

import {
  buildInitialWebsitesCoreState,
  mergeWebsiteForm,
  setWebsiteSavingPending,
  setWebsiteSavingRejected,
  syncCurrentSiteDataFromOverview,
  syncWebsiteIntegrations,
} from './websitesCoreHelpers';

const overviewPayload = {
  site: {
    id: 'site-1',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    templateId: 'template-1',
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
} as const;

const updatedForm = {
  ...overviewPayload.forms[0],
  operationalSettings: {
    heading: 'Reach out today',
  },
};

const updatedIntegrations = {
  ...overviewPayload.integrations,
  stripe: {
    ...overviewPayload.integrations.stripe,
    accountId: 'acct_123',
  },
};

describe('websites core helper state', () => {
  it('hydrates the current-site cache from the overview payload', () => {
    let state = buildInitialWebsitesCoreState();

    state = createNextState(state, (draft) => {
      draft.overview = overviewPayload as never;
      draft.currentSiteId = overviewPayload.site.id;
      syncCurrentSiteDataFromOverview(draft, overviewPayload as never);
    });

    expect(state.currentSiteData).toMatchObject({
      siteId: 'site-1',
      forms: overviewPayload.forms,
      integrations: overviewPayload.integrations,
      analytics: overviewPayload.conversionMetrics,
    });
  });

  it('merges form and integration updates back into the active site cache and overview summary', () => {
    let state = buildInitialWebsitesCoreState();

    state = createNextState(state, (draft) => {
      draft.overview = overviewPayload as never;
      draft.currentSiteId = overviewPayload.site.id;
      syncCurrentSiteDataFromOverview(draft, overviewPayload as never);
    });

    state = createNextState(state, (draft) => {
      mergeWebsiteForm(draft, 'site-1', updatedForm as never);
      syncWebsiteIntegrations(draft, 'site-1', updatedIntegrations as never);
    });

    expect(state.currentSiteData.forms[0]).toEqual(updatedForm);
    expect(state.currentSiteData.integrations).toEqual(updatedIntegrations);
    expect(state.overview?.forms[0]).toEqual(updatedForm);
    expect(state.overview?.integrations).toEqual(updatedIntegrations);
  });

  it('tracks pending and rejected saving states for website mutations', () => {
    let state = buildInitialWebsitesCoreState();

    state = createNextState(state, (draft) => {
      setWebsiteSavingPending(draft);
    });

    expect(state.isSaving).toBe(true);
    expect(state.error).toBeNull();

    state = createNextState(state, (draft) => {
      setWebsiteSavingRejected(draft, 'Publish blocked');
    });

    expect(state.isSaving).toBe(false);
    expect(state.error).toBe('Publish blocked');
  });
});
