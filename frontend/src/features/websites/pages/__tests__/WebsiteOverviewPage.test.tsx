import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import WebsiteOverviewPage from '../WebsiteOverviewPage';

const mockState = {
  websites: {
    isLoading: false,
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
    mailchimp: {
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
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../hooks/useWebsiteOverviewLoader', () => ({
  __esModule: true,
  default: () => overview,
}));

describe('WebsiteOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders site health, live routes, and site-aware builder actions', () => {
    renderOverview();

    expect(screen.getByText('Neighborhood Mutual Aid')).toBeInTheDocument();
    expect(screen.getByText('Total conversions')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText(/publish, domain, and integration changes stay blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Builder' })).toHaveAttribute(
      'href',
      '/websites/site-1/builder'
    );
    expect(screen.getByRole('link', { name: 'Publish Controls' })).toHaveAttribute(
      'href',
      '/websites/site-1/publishing'
    );
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute(
      'href',
      'https://preview.mutualaid.org'
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getAllByText('/events')).toHaveLength(2);
    expect(screen.getByText(/event register/i)).toBeInTheDocument();
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
