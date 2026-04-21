import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import WebsiteOverviewPage from '../WebsiteOverviewPage';

const dispatchMock = vi.fn(() => Promise.resolve());

const mockState = {
  websites: {
    isLoading: false,
    funnelLoading: false,
    funnelError: null as string | null,
    funnel: {
      siteId: 'site-1',
      periodStart: '2026-02-05T00:00:00.000Z',
      periodEnd: '2026-03-06T00:00:00.000Z',
      steps: [
        { step: 'view', count: 240, uniqueVisitors: 120 },
        { step: 'submit', count: 36, uniqueVisitors: 24 },
        { step: 'confirm', count: 18, uniqueVisitors: 14 },
      ],
      recentEvents: [
        {
          id: 'funnel-1',
          conversionType: 'form_submit',
          step: 'submit',
          pagePath: '/volunteer',
          visitorId: 'visitor-1',
          sessionId: 'session-1',
          referrer: null,
          userAgent: 'Mozilla/5.0',
          sourceEntityType: 'volunteer',
          sourceEntityId: 'volunteer-1',
          eventData: {},
          occurredAt: '2026-03-05T14:00:00.000Z',
        },
      ],
    },
  },
};

const overview = {
  site: {
    id: 'site-1',
    templateId: 'template-1',
    templateName: 'Community Template',
    templateStatus: 'published',
    organizationId: 'org-1',
    organizationName: 'Neighborhood Mutual Aid',
    siteKind: 'organization',
    migrationStatus: 'complete',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    subdomain: 'mutual-aid',
    customDomain: 'mutualaid.org',
    sslEnabled: true,
    sslCertificateExpiresAt: '2026-12-31T00:00:00.000Z',
    publishedVersion: 'v4',
    publishedAt: '2026-03-05T12:00:00.000Z',
    primaryUrl: 'https://mutualaid.org',
    previewUrl: 'https://preview.mutualaid.org',
    analyticsEnabled: true,
    blocked: true,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-05T12:00:00.000Z',
  },
  template: {
    id: 'template-1',
    name: 'Community Template',
    status: 'published',
    updatedAt: '2026-03-05T12:00:00.000Z',
  },
  deployment: {
    primaryUrl: 'https://mutualaid.org',
    previewUrl: 'https://preview.mutualaid.org',
    domainStatus: 'configured',
    sslStatus: 'active',
  },
  liveRoutes: [
    {
      pageId: 'page-1',
      pageName: 'Home',
      pageSlug: 'home',
      pageType: 'static',
      routePattern: '/',
      path: '/',
      live: true,
    },
    {
      pageId: 'page-2',
      pageName: 'Events',
      pageSlug: 'events',
      pageType: 'collectionIndex',
      collection: 'events',
      routePattern: '/events',
      path: '/events',
      live: true,
    },
  ],
  draftRoutes: [],
  contentSummary: {
    nativeNewsletters: 2,
    syncedNewsletters: 4,
    publishedNewsletters: 5,
  },
  forms: [
    {
      formKey: 'newsletter-1',
      componentId: 'newsletter-1',
      formType: 'newsletter-signup',
      title: 'Newsletter signup',
      pageId: 'page-1',
      pageName: 'Home',
      pageSlug: 'home',
      pageType: 'static',
      routePattern: '/',
      path: '/',
      live: true,
      blocked: true,
      sourceConfig: {},
      operationalSettings: {},
      publicRuntime: {
        siteKey: 'site-1',
        publicPath: '/',
        publicUrl: 'https://mutualaid.org',
        previewUrl: 'https://preview.mutualaid.org',
        submissionPath: '/api/v2/public/forms/site-1/newsletter-1/submit',
      },
    },
  ],
  conversionMetrics: {
    totalPageviews: 240,
    uniqueVisitors: 120,
    formSubmissions: 9,
    eventRegistrations: 3,
    donations: 2,
    totalConversions: 14,
    periodStart: '2026-02-05T00:00:00.000Z',
    periodEnd: '2026-03-06T00:00:00.000Z',
    recentConversions: [
      {
        id: 'evt-1',
        siteId: 'site-1',
        pagePath: '/events',
        eventType: 'event_register',
        createdAt: '2026-03-05T12:00:00.000Z',
      },
    ],
  },
  integrations: {
    blocked: true,
    publishStatus: 'published',
    newsletter: {
      provider: 'mautic',
      configured: true,
      lastSyncAt: null,
    },
    mailchimp: {
      configured: true,
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
  },
  settings: {
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
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../hooks/useWebsiteOverviewLoader', () => ({
  __esModule: true,
  default: () => overview,
}));

vi.mock('../../state', () => ({
  fetchWebsiteConversionFunnel: (payload: unknown) => ({
    type: 'websites/fetchConversionFunnel',
    payload,
  }),
}));

describe('WebsiteOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders site health, live routes, and the additive funnel summary', () => {
    renderOverview();

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'websites/fetchConversionFunnel',
        payload: { siteId: 'site-1', windowDays: 30 },
      })
    );
    expect(screen.getByText('Managed form spotlight')).toBeInTheDocument();
    expect(screen.getByText('Submission endpoint')).toBeInTheDocument();
    expect(screen.getByText('/api/v2/public/forms/site-1/newsletter-1/submit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open live page' })).toHaveAttribute(
      'href',
      'https://mutualaid.org'
    );
    expect(screen.getByText('Neighborhood Mutual Aid')).toBeInTheDocument();
    expect(screen.getByText('Recommended next step')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Resolve the blocking site assignment' })
    ).toHaveAttribute('href', '/websites/site-1/publishing');
    expect(screen.getByText('Total conversions')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText(/publish, domain, and integration changes stay blocked/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open builder' })[0]).toHaveAttribute(
      'href',
      '/websites/site-1/builder'
    );
    expect(screen.getAllByRole('link', { name: 'Content' })[0]).toHaveAttribute(
      'href',
      '/websites/site-1/content'
    );
    expect(screen.getAllByRole('link', { name: 'Forms' })[0]).toHaveAttribute(
      'href',
      '/websites/site-1/forms'
    );
    expect(screen.getAllByRole('link', { name: 'Publishing' })[0]).toHaveAttribute(
      'href',
      '/websites/site-1/publishing'
    );
    expect(screen.getByRole('link', { name: 'Open preview' })).toHaveAttribute(
      'href',
      'https://preview.mutualaid.org'
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getAllByText('/events')).toHaveLength(2);
    expect(screen.getByText(/event register/i)).toBeInTheDocument();
    expect(screen.getByText('Conversion funnel')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText(/View to Submit: 15%/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop-off: 204/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit • form submit/i)).toBeInTheDocument();
    expect(screen.getByText('/volunteer')).toBeInTheDocument();
  });
});

function renderOverview() {
  return renderWithRoutes(
    <Routes>
      <Route path="/websites/:siteId/overview" element={<WebsiteOverviewPage />} />
    </Routes>
  );
}

function renderWithRoutes(ui: ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/overview']}>{ui}</MemoryRouter>
  );
}
