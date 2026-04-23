import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBuilderSiteContext } from '../useBuilderSiteContext';
import { websitesApiClient } from '../../../websites/api/websitesApiClient';
import type { WebsiteOverviewSummary } from '../../../websites/types';

vi.mock('../../../websites/api/websitesApiClient', () => ({
  websitesApiClient: {
    getOverview: vi.fn(),
  },
}));

const createOverview = (siteId: string, overrides: Record<string, unknown> = {}) =>
  ({
    site: {
      id: siteId,
      templateId: `template-${siteId}`,
      templateName: `Template ${siteId}`,
      templateStatus: 'published',
      organizationId: 'org-1',
      organizationName: 'Neighborhood Mutual Aid',
      siteKind: 'organization',
      migrationStatus: 'complete',
      name: `Site ${siteId}`,
      status: 'published',
      subdomain: siteId,
      customDomain: null,
      sslEnabled: true,
      sslCertificateExpiresAt: null,
      publishedVersion: 'v1',
      publishedAt: '2026-04-18T00:00:00.000Z',
      primaryUrl: `https://${siteId}.example.org`,
      previewUrl: `https://${siteId}.preview.example.org`,
      analyticsEnabled: true,
      blocked: false,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
    template: {
      id: `template-${siteId}`,
      name: `Template ${siteId}`,
      status: 'published',
      updatedAt: '2026-04-18T00:00:00.000Z',
    },
    deployment: {
      primaryUrl: `https://${siteId}.example.org`,
      previewUrl: `https://${siteId}.preview.example.org`,
      domainStatus: 'configured',
      sslStatus: 'active',
    },
    liveRoutes: [],
    draftRoutes: [],
    contentSummary: {
      nativeNewsletters: 0,
      syncedNewsletters: 0,
      publishedNewsletters: 0,
    },
    forms: [],
    conversionMetrics: {
      totalPageviews: 0,
      uniqueVisitors: 0,
      formSubmissions: 0,
      eventRegistrations: 0,
      donations: 0,
      totalConversions: 0,
      periodStart: '2026-04-01T00:00:00.000Z',
      periodEnd: '2026-04-18T00:00:00.000Z',
      recentConversions: [],
    },
    integrations: {
      blocked: false,
      publishStatus: 'published',
      newsletter: {
        provider: 'mautic',
        configured: false,
        selectedAudienceId: null,
        selectedAudienceName: null,
        selectedPresetId: null,
        listPresets: [],
        availableAudiences: [],
        audienceCount: 0,
        lastRefreshedAt: null,
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
    },
    settings: {
      siteId,
      organizationId: 'org-1',
      newsletter: {},
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
    ...overrides,
  }) as WebsiteOverviewSummary;

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('useBuilderSiteContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the cleared idle state when siteId is missing', () => {
    const { result } = renderHook(() => useBuilderSiteContext(undefined));

    expect(result.current).toEqual({
      siteContext: null,
      siteContextLoading: false,
      siteContextError: null,
    });
    expect(websitesApiClient.getOverview).not.toHaveBeenCalled();
  });

  it('loads builder site context for the current site id', async () => {
    vi.mocked(websitesApiClient.getOverview).mockResolvedValueOnce(createOverview('site-1'));

    const { result } = renderHook(() => useBuilderSiteContext('site-1'));

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextLoading).toBe(true);
    expect(result.current.siteContextError).toBeNull();

    await waitFor(() =>
      expect(result.current.siteContext).toMatchObject({
        siteId: 'site-1',
        templateId: 'template-site-1',
        siteName: 'Site site-1',
      })
    );
    expect(result.current.siteContextLoading).toBe(false);
    expect(result.current.siteContextError).toBeNull();
  });

  it('clears stale site context immediately when the site id changes', async () => {
    const pendingNextOverview = createDeferred<WebsiteOverviewSummary>();
    vi.mocked(websitesApiClient.getOverview)
      .mockResolvedValueOnce(createOverview('site-1'))
      .mockReturnValueOnce(pendingNextOverview.promise);

    const { result, rerender } = renderHook(
      ({ siteId }: { siteId: string | undefined }) => useBuilderSiteContext(siteId),
      {
        initialProps: { siteId: 'site-1' },
      }
    );

    await waitFor(() => expect(result.current.siteContext?.siteId).toBe('site-1'));

    rerender({ siteId: 'site-2' });

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextLoading).toBe(true);
    expect(result.current.siteContextError).toBeNull();

    pendingNextOverview.resolve(createOverview('site-2'));

    await waitFor(() => expect(result.current.siteContext?.siteId).toBe('site-2'));
    expect(result.current.siteContextLoading).toBe(false);
    expect(result.current.siteContextError).toBeNull();
  });

  it('ignores late responses from the previous site after navigation', async () => {
    const firstOverview = createDeferred<WebsiteOverviewSummary>();
    const secondOverview = createDeferred<WebsiteOverviewSummary>();
    vi.mocked(websitesApiClient.getOverview)
      .mockReturnValueOnce(firstOverview.promise)
      .mockReturnValueOnce(secondOverview.promise);

    const { result, rerender } = renderHook(
      ({ siteId }: { siteId: string | undefined }) => useBuilderSiteContext(siteId),
      {
        initialProps: { siteId: 'site-1' },
      }
    );

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextLoading).toBe(true);

    rerender({ siteId: 'site-2' });

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextLoading).toBe(true);
    expect(result.current.siteContextError).toBeNull();

    firstOverview.resolve(createOverview('site-1'));
    await Promise.resolve();

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextLoading).toBe(true);
    expect(result.current.siteContextError).toBeNull();

    secondOverview.resolve(createOverview('site-2'));

    await waitFor(() => expect(result.current.siteContext?.siteId).toBe('site-2'));
    expect(result.current.siteContextLoading).toBe(false);
    expect(result.current.siteContextError).toBeNull();
  });

  it('keeps site context cleared when the next site fetch fails', async () => {
    vi.mocked(websitesApiClient.getOverview)
      .mockResolvedValueOnce(createOverview('site-1'))
      .mockRejectedValueOnce(new Error('Site context failed'));

    const { result, rerender } = renderHook(
      ({ siteId }: { siteId: string | undefined }) => useBuilderSiteContext(siteId),
      {
        initialProps: { siteId: 'site-1' },
      }
    );

    await waitFor(() => expect(result.current.siteContext?.siteId).toBe('site-1'));

    rerender({ siteId: 'site-2' });

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextLoading).toBe(true);
    expect(result.current.siteContextError).toBeNull();

    await waitFor(() => expect(result.current.siteContextLoading).toBe(false));
    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextError).toBe('Site context failed');
  });

  it('keeps site context null and surfaces an error when the linked template is missing', async () => {
    const overview = createOverview('site-3');
    vi.mocked(websitesApiClient.getOverview).mockResolvedValueOnce({
      ...overview,
      site: {
        ...overview.site,
        templateId: null,
      },
      template: {
        ...overview.template,
        id: '',
      },
    });

    const { result } = renderHook(() => useBuilderSiteContext('site-3'));

    await waitFor(() => expect(result.current.siteContextLoading).toBe(false));

    expect(result.current.siteContext).toBeNull();
    expect(result.current.siteContextError).toBe('This site does not have a linked template.');
  });

  it('returns to the cleared idle state when the site id becomes undefined', async () => {
    vi.mocked(websitesApiClient.getOverview).mockResolvedValueOnce(createOverview('site-1'));

    const { result, rerender } = renderHook(
      ({ siteId }: { siteId: string | undefined }) => useBuilderSiteContext(siteId),
      {
        initialProps: { siteId: 'site-1' },
      }
    );

    await waitFor(() => expect(result.current.siteContext?.siteId).toBe('site-1'));

    rerender({ siteId: undefined });

    expect(result.current).toEqual({
      siteContext: null,
      siteContextLoading: false,
      siteContextError: null,
    });
  });
});
