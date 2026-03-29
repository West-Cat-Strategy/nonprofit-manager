import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteContentPage from '../WebsiteContentPage';

const dispatchMock = vi.fn();

const thunkMocks = vi.hoisted(() => {
  const createAction = (type: string, marker: string) =>
    Object.assign(
      (payload?: unknown) => ({ type, payload, marker }),
      {
        fulfilled: {
          match: (action: { type?: string }) => action?.type === `${type}/fulfilled`,
        },
      }
    );

  return {
    clearWebsitesError: vi.fn(() => ({ type: 'websites/clearError' })),
    fetchWebsiteEntries: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchEntries',
      payload,
      marker: 'fetchEntries',
    })),
    fetchWebsiteOverview: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchOverview',
      payload,
      marker: 'fetchOverview',
    })),
    createWebsiteEntry: createAction('websites/createEntry', 'createEntry'),
    updateWebsiteEntry: createAction('websites/updateEntry', 'updateEntry'),
    deleteWebsiteEntry: createAction('websites/deleteEntry', 'deleteEntry'),
    syncWebsiteMailchimpEntries: createAction(
      'websites/syncMailchimpEntries',
      'syncMailchimpEntries'
    ),
  };
});

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
    blocked: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-05T12:00:00.000Z',
  },
  contentSummary: {
    nativeNewsletters: 1,
    syncedNewsletters: 1,
    publishedNewsletters: 1,
  },
  integrations: {
    blocked: false,
    publishStatus: 'published',
    mailchimp: {
      audienceId: 'aud-1',
      configured: true,
      availableAudiences: [],
      lastSyncAt: null,
    },
    stripe: {
      configured: true,
      publishableKeyConfigured: true,
    },
  },
  draftRoutes: [
    {
      pageId: 'page-2',
      pageName: 'Newsletter Detail',
      pageSlug: 'newsletter-detail',
      pageType: 'collectionDetail',
      routePattern: '/newsletters/:slug',
      path: '/newsletters/:slug',
      live: false,
    },
  ],
};

const mockState = {
  websites: {
    entries: [
      {
        id: 'entry-native-1',
        organizationId: 'org-1',
        siteId: 'site-1',
        kind: 'newsletter',
        source: 'native',
        status: 'draft',
        slug: 'spring-update',
        title: 'Spring Update',
        excerpt: 'Latest news',
        body: null,
        bodyHtml: '<p>Latest news</p>',
        seo: {},
        metadata: {},
        externalSourceId: null,
        publishedAt: null,
        createdAt: '2026-03-05T12:00:00.000Z',
        updatedAt: '2026-03-05T12:00:00.000Z',
      },
      {
        id: 'entry-sync-1',
        organizationId: 'org-1',
        siteId: 'site-1',
        kind: 'newsletter',
        source: 'mailchimp',
        status: 'published',
        slug: 'march-campaign',
        title: 'March Campaign',
        excerpt: 'Mailchimp mirror',
        body: null,
        bodyHtml: null,
        seo: {},
        metadata: {},
        externalSourceId: 'mc-1',
        publishedAt: '2026-03-04T00:00:00.000Z',
        createdAt: '2026-03-04T00:00:00.000Z',
        updatedAt: '2026-03-04T00:00:00.000Z',
      },
    ],
    isLoading: false,
    isSaving: false,
    error: null,
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

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof WebsitesStateModule>('../../state');
  return {
    ...actual,
    clearWebsitesError: thunkMocks.clearWebsitesError,
    fetchWebsiteEntries: thunkMocks.fetchWebsiteEntries,
    fetchWebsiteOverview: thunkMocks.fetchWebsiteOverview,
    createWebsiteEntry: thunkMocks.createWebsiteEntry,
    updateWebsiteEntry: thunkMocks.updateWebsiteEntry,
    deleteWebsiteEntry: thunkMocks.deleteWebsiteEntry,
    syncWebsiteMailchimpEntries: thunkMocks.syncWebsiteMailchimpEntries,
  };
});

describe('WebsiteContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockImplementation(
      (action: { type?: string; marker?: string }) =>
        Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('loads entries, creates a native newsletter entry, and syncs Mailchimp content', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/fetchEntries',
          payload: { siteId: 'site-1' },
        })
      );
    });

    expect(screen.getByText('Spring Update')).toBeInTheDocument();
    expect(screen.getByText('March Campaign')).toBeInTheDocument();
    expect(screen.getByText('Content filters')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter content source'), {
      target: { value: 'native' },
    });
    fireEvent.change(screen.getByLabelText('Filter content status'), {
      target: { value: 'draft' },
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/fetchEntries',
          payload: {
            siteId: 'site-1',
            source: 'native',
            status: 'draft',
          },
        })
      );
    });

    fireEvent.change(screen.getByPlaceholderText('Newsletter title'), {
      target: { value: 'April Update' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create entry' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/createEntry',
          payload: expect.objectContaining({
            siteId: 'site-1',
            data: expect.objectContaining({ title: 'April Update', kind: 'newsletter' }),
          }),
        })
      );
    });
    expect(screen.getByText('Newsletter entry created.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sync Mailchimp' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/syncMailchimpEntries',
          payload: { siteId: 'site-1', listId: 'aud-1' },
        })
      );
    });
    expect(screen.getByText('Mailchimp archive synced.')).toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/content']}>
      <Routes>
        <Route path="/websites/:siteId/content" element={<WebsiteContentPage />} />
      </Routes>
    </MemoryRouter>
  );
}
