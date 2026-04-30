import { describe, expect, it } from 'vitest';
import type { ComponentType } from '../../../../types/websiteBuilder';
import {
  deriveWebsiteManagedFormVerification,
  getFormSurfaceMeta,
} from '../websiteConsole';
import type {
  WebsiteFormDefinition,
  WebsiteManagedFormType,
  WebsiteOverviewSummary,
} from '../../types';

const managedFormContractSmoke: Record<
  WebsiteManagedFormType,
  Extract<ComponentType, WebsiteManagedFormType>
> = {
  'contact-form': 'contact-form',
  'newsletter-signup': 'newsletter-signup',
  'donation-form': 'donation-form',
  'volunteer-interest-form': 'volunteer-interest-form',
  'referral-form': 'referral-form',
  'event-registration': 'event-registration',
};

const integrations = {
  blocked: false,
  publishStatus: 'published',
  newsletter: {
    provider: 'mautic',
    configured: true,
    selectedAudienceId: 'segment-1',
    selectedAudienceName: 'Supporters',
    selectedPresetId: null,
    listPresets: [],
    availableAudiences: [],
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
    availableAudiences: [],
    lastSyncAt: null,
  },
  stripe: {
    configured: true,
    publishableKeyConfigured: true,
  },
  social: {
    facebook: {
      lastSyncAt: null,
      lastSyncError: null,
    },
  },
} satisfies WebsiteOverviewSummary['integrations'];

const buildForm = (
  formType: WebsiteManagedFormType,
  overrides: Partial<WebsiteFormDefinition> = {}
): WebsiteFormDefinition =>
  ({
    formKey: `${formType}-1`,
    componentId: `${formType}-1`,
    formType,
    title: getFormSurfaceMeta(formType).label,
    pageId: 'page-1',
    pageName: 'Home',
    pageSlug: 'home',
    pageType: 'static',
    routePattern: '/',
    path: '/',
    live: true,
    blocked: false,
    sourceConfig: {},
    operationalSettings: {},
    ...overrides,
  }) as WebsiteFormDefinition;

const buildOverview = (form: WebsiteFormDefinition): WebsiteOverviewSummary =>
  ({
    site: {
      id: 'site-1',
      name: 'Neighborhood mutual aid',
      status: 'published',
      blocked: false,
      primaryUrl: 'https://mutualaid.example.org',
      previewUrl: 'https://preview.mutualaid.example.org?preview=true&version=v-preview',
    },
    deployment: {
      primaryUrl: 'https://mutualaid.example.org',
      previewUrl: 'https://preview.mutualaid.example.org?preview=true&version=v-preview',
      domainStatus: 'configured',
      sslStatus: 'active',
    },
    forms: [form],
    integrations,
    liveRoutes: [],
    draftRoutes: [],
    contentSummary: {
      nativeNewsletters: 0,
      syncedNewsletters: 0,
      publishedNewsletters: 0,
    },
    conversionMetrics: {
      totalConversions: 0,
      totalPageviews: 0,
      uniqueVisitors: 0,
      formSubmissions: 0,
      eventRegistrations: 0,
      donations: 0,
      periodStart: '2026-04-01T00:00:00.000Z',
      periodEnd: '2026-04-30T00:00:00.000Z',
      recentConversions: [],
    },
  }) as WebsiteOverviewSummary;

describe('websiteConsole managed form verification', () => {
  it('keeps managed form types aligned with the website-builder component contract', () => {
    expect(Object.keys(managedFormContractSmoke)).toEqual([
      'contact-form',
      'newsletter-signup',
      'donation-form',
      'volunteer-interest-form',
      'referral-form',
      'event-registration',
    ]);
  });

  it('reads event-registration submission metadata from the public runtime contract', () => {
    const summary = deriveWebsiteManagedFormVerification(
      buildOverview(
        buildForm('event-registration', {
          pageType: 'collectionDetail',
          collection: 'events',
          routePattern: '/events/:slug',
          path: '/events/:slug',
          publicRuntime: {
            siteKey: 'site-1',
            publicPath: '/events/:slug',
            publicUrl: null,
            previewUrl: null,
            submissionPath: '/api/v2/public/events/:event_id/registrations?site=site-1',
          },
        })
      )
    );

    expect(summary?.submissionEndpoint).toBe(
      '/api/v2/public/events/:event_id/registrations?site=site-1'
    );
    expect(summary?.livePageUrl).toBeNull();
    expect(summary?.readiness).toMatchObject({
      launchReady: true,
      live: true,
      submission: true,
    });
    expect(summary?.launchStateDetail).toContain('live event detail page');
  });

  it('keeps the compatibility fallback for public form definitions without publicRuntime', () => {
    const summary = deriveWebsiteManagedFormVerification(buildOverview(buildForm('referral-form')));

    expect(summary?.submissionEndpoint).toBe('/api/v2/public/forms/site-1/referral-form-1/submit');
    expect(summary?.readiness.submission).toBe(true);
  });
});
