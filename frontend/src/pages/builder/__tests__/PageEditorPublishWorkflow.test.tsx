import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import PageEditor from '../../../features/builder/pages/PageEditorPage';
import { createTestStore, renderWithProviders } from '../../../test/testUtils';
import type { RootState } from '../../../store';
import type * as EditorModule from '../../../components/editor';

const sequence: string[] = [];

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../../services/api', () => ({
  default: apiMock,
  createRequestController: vi.fn(),
  createCancellableRequest: vi.fn(),
}));

vi.mock('../../../components/editor', async () => {
  const actual = await vi.importActual<typeof EditorModule>(
    '../../../components/editor'
  );

  return {
    ...actual,
    EditorHeader: () => <div>Editor Header</div>,
    ComponentPalette: () => <div>Component Palette</div>,
    EditorCanvas: () => <div>Editor Canvas</div>,
    PageList: () => <div>Page List</div>,
  };
});

vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: true,
    saveNow: vi.fn(async () => {
      sequence.push('save-now');
    }),
  }),
}));

vi.mock('../../../hooks/useEditorHistory', () => ({
  useEditorHistory: (initialSections: unknown[]) => ({
    sections: initialSections,
    setSections: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    isDirty: false,
    canUndo: false,
    canRedo: false,
  }),
}));

describe('PageEditor publish workflow', () => {
  beforeEach(() => {
    sequence.length = 0;
    vi.clearAllMocks();

    apiMock.get.mockImplementation(async (url: string) => {
      sequence.push(`get:${url}`);

      if (url.startsWith('/templates/template-1')) {
        return { data: currentTemplate };
      }

      if (url.startsWith('/sites/site-1/overview')) {
        return { data: overviewResponse };
      }

      if (url.startsWith('/sites/site-1/deployment')) {
        return { data: deploymentResponse };
      }

      if (url.startsWith('/sites/site-1/versions')) {
        return { data: versionsResponse };
      }

      return { data: {} };
    });

    apiMock.put.mockImplementation(async (url: string) => {
      sequence.push(`put:${url}`);
      return { data: currentPage };
    });

    apiMock.post.mockImplementation(async (url: string) => {
      sequence.push(`post:${url}`);

      if (url === '/sites/publish') {
        return {
          data: {
            siteId: 'site-1',
            url: 'https://mutualaid.org',
            publishedAt: '2026-03-05T12:00:00.000Z',
            version: 'v5',
            target: 'live',
            status: 'success',
          },
        };
      }

      if (url === '/sites/site-1/cache/invalidate') {
        return { data: { invalidated: true, siteId: 'site-1' } };
      }

      return { data: {} };
    });

    apiMock.delete.mockImplementation(async () => ({ data: {} }));
  });

  it('saves pending page changes before publishing live from the builder', async () => {
    const user = userEvent.setup();
    const store = createTestStore(preloadedState);

    renderWithProviders(
      <Routes>
        <Route path="/websites/:siteId/builder" element={<PageEditor />} />
      </Routes>,
      {
        store,
        route: '/websites/site-1/builder',
      }
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/sites/publish', {
        siteId: 'site-1',
        templateId: 'template-1',
        target: 'live',
      });
    });

    expect(sequence).toEqual(
      expect.arrayContaining([
        'save-now',
        'put:/templates/template-1/pages/page-1',
        'post:/sites/publish',
      ])
    );
    expect(sequence.indexOf('save-now')).toBeLessThan(sequence.indexOf('put:/templates/template-1/pages/page-1'));
    expect(sequence.indexOf('put:/templates/template-1/pages/page-1')).toBeLessThan(
      sequence.indexOf('post:/sites/publish')
    );

    expect(screen.getByText(/Published live at https:\/\/mutualaid\.org/i)).toBeInTheDocument();
  });
});

const currentPage = {
  id: 'page-1',
  name: 'Home',
  slug: 'home',
  isHomepage: true,
  pageType: 'static' as const,
  routePattern: '/',
  seo: {
    title: 'Home',
    description: 'Home page',
  },
  sections: [
    {
      id: 'section-1',
      name: 'Hero',
      components: [],
    },
  ],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-05T12:00:00.000Z',
};

const currentTemplate = {
  id: 'template-1',
  userId: 'user-1',
  name: 'Community Template',
  description: 'A better site',
  category: 'landing-page' as const,
  tags: [],
  status: 'draft' as const,
  isSystemTemplate: false,
  theme: {
    colors: {
      primary: '#111111',
      secondary: '#222222',
      accent: '#005fcc',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#111111',
      textMuted: '#666666',
      border: '#d1d5db',
      error: '#b91c1c',
      success: '#15803d',
      warning: '#b45309',
    },
    typography: {
      fontFamily: 'Test Sans',
      headingFontFamily: 'Test Sans',
      baseFontSize: '16px',
      lineHeight: '1.5',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
      full: '9999px',
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    },
  },
  globalSettings: {
    language: 'en',
    header: { navigation: [] },
    footer: { columns: [] },
  },
  pages: [currentPage],
  metadata: {
    version: '1.0.0',
  },
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-05T12:00:00.000Z',
};

const overviewResponse = {
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
  template: {
    id: 'template-1',
    name: 'Community Template',
    status: 'published',
    updatedAt: '2026-03-05T12:00:00.000Z',
  },
  deployment: {
    primaryUrl: 'https://mutualaid.org',
    previewUrl: 'https://preview.mutualaid.org',
    domainStatus: 'configured' as const,
    sslStatus: 'active' as const,
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
    periodStart: '2026-02-05T00:00:00.000Z',
    periodEnd: '2026-03-06T00:00:00.000Z',
    recentConversions: [],
  },
  integrations: {
    blocked: false,
    publishStatus: 'published' as const,
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

const deploymentResponse = {
  siteId: 'site-1',
  subdomain: 'mutual-aid',
  customDomain: 'mutualaid.org',
  primaryUrl: 'https://mutualaid.org',
  previewUrl: 'https://preview.mutualaid.org',
  status: 'published' as const,
  lastPublished: '2026-03-05T12:00:00.000Z',
  version: 'v4',
  sslEnabled: true,
  sslExpiresAt: '2026-12-31T00:00:00.000Z',
};

const versionsResponse = {
  siteId: 'site-1',
  versions: [],
  currentVersion: 'v4',
  total: 0,
};

const preloadedState = {
  templates: {
    templates: [],
    systemTemplates: [],
    currentTemplate,
    currentPage,
    versions: [],
    searchParams: {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    pagination: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
    isLoading: false,
    isSaving: false,
    error: null,
  },
} satisfies Partial<RootState>;
