import type { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../websites/api/websitesApiClient', () => ({
  websitesApiClient: {
    getOverview: vi.fn(),
  },
}));

vi.mock('../../../websites/state', () => ({
  fetchWebsiteDeployment: vi.fn(() => ({ type: 'websites/fetchDeployment' })),
  fetchWebsiteOverview: vi.fn((payload: unknown) => ({
    type: 'websites/fetchOverview',
    payload,
  })),
  fetchWebsiteVersions: vi.fn((payload: unknown) => ({
    type: 'websites/fetchVersions',
    payload,
  })),
  publishWebsiteSite: vi.fn((payload: unknown) => ({
    type: 'websites/publishSite',
    payload,
    unwrap: () => Promise.resolve({ url: 'https://example.org' }),
  })),
}));

import api from '../../../../services/api';
import type { PageSection, Template, TemplatePage } from '../../../../types/websiteBuilder';
import templateReducer, { fetchTemplate } from '../../state/templateCore';
import { websitesApiClient } from '../../../websites/api/websitesApiClient';
import { usePageEditorController } from '../usePageEditorController';

const createSection = (id: string, components: Array<Record<string, unknown>>): PageSection =>
  ({
    id,
    name: `Section ${id}`,
    components,
  }) as PageSection;

const createPage = (overrides: Partial<TemplatePage> = {}): TemplatePage =>
  ({
    id: 'page-home',
    name: 'Home',
    slug: 'home',
    isHomepage: true,
    pageType: 'static',
    routePattern: '/',
    seo: {
      title: 'Home',
      description: 'Home page',
    },
    sections: [
      createSection('section-home', [
        {
          id: 'component-a',
          type: 'text',
          content: 'Welcome home',
          align: 'left',
        },
        {
          id: 'component-b',
          type: 'text',
          content: 'Second block',
          align: 'left',
        },
      ]),
    ],
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }) as TemplatePage;

const createTemplate = (): Template =>
  ({
    id: 'template-1',
    name: 'Advocacy',
    description: 'Campaign landing page',
    category: 'landing-page',
    tags: ['campaign'],
    status: 'draft',
    isSystemTemplate: false,
    theme: {
      colors: {
        primary: '#123456',
        secondary: '#654321',
        accent: '#ff9900',
        background: '#ffffff',
        surface: '#f7f7f7',
        text: '#111111',
        textSecondary: '#444444',
        border: '#dddddd',
        success: '#0f9d58',
        warning: '#f4b400',
        error: '#db4437',
      },
      typography: {
        fontFamily: 'Atkinson Hyperlegible',
        headingFontFamily: 'Atkinson Hyperlegible',
        baseFontSize: '16px',
        scale: 1.2,
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
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.08)',
        md: '0 4px 12px rgba(0, 0, 0, 0.12)',
        lg: '0 12px 24px rgba(0, 0, 0, 0.16)',
      },
    },
    globalSettings: {
      language: 'en',
      header: {
        navigation: [],
      },
      footer: {
        columns: [],
      },
    },
    pages: [
      createPage(),
      createPage({
        id: 'page-about',
        name: 'About',
        slug: 'about',
        isHomepage: false,
        routePattern: '/about',
        sections: [createSection('section-about', [])],
      }),
    ],
    metadata: {
      version: '1.0.0',
      thumbnailImage: 'thumb.png',
    },
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
  }) as Template;

const createStore = () => {
  const templatesState = templateReducer(
    undefined,
    fetchTemplate.fulfilled(createTemplate(), 'seed-request', 'template-1')
  );

  return configureStore({
    reducer: {
      templates: templateReducer,
    },
    preloadedState: {
      templates: templatesState,
    },
  });
};

const createWrapper = (
  store: ReturnType<typeof createStore>,
  options?: {
    initialEntries?: string[];
    routePath?: string;
  }
) =>
  function Wrapper({ children }: { children: ReactNode }) {
    const initialEntries = options?.initialEntries ?? ['/website-builder/template-1'];
    const routePath = options?.routePath ?? '/website-builder/:templateId';

    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path={routePath} element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

describe('usePageEditorController', () => {
  const template = createTemplate();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: template });
    vi.mocked(websitesApiClient.getOverview).mockResolvedValue({
      site: {
        id: 'site-1',
        name: 'Neighborhood Mutual Aid',
        status: 'published',
        blocked: false,
        templateId: 'template-1',
      },
      template: {
        id: 'template-1',
      },
      deployment: {
        primaryUrl: 'https://example.org',
        previewUrl: 'https://preview.example.org',
      },
    } as never);
    vi.mocked(api.put).mockImplementation((url: unknown, payload: unknown) => {
      if (url === '/templates/template-1/pages/page-home') {
        const body = payload as { sections?: PageSection[] };
        return Promise.resolve({
          data: {
            ...template.pages[0],
            sections: body.sections ?? template.pages[0].sections,
          },
        });
      }

      return Promise.resolve({ data: template });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates editor changes into redux state and autosaves them after the debounce window', async () => {
    const store = createStore();
    const { result } = renderHook(() => usePageEditorController(), {
      wrapper: createWrapper(store),
    });

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/templates/template-1'));
    await waitFor(() => expect(result.current.currentPage?.id).toBe('page-home'));

    act(() => {
      result.current.handleUpdateComponent('component-a', {
        content: 'Updated hero copy',
      });
    });

    await waitFor(
      () =>
        expect(result.current.historySections[0].components[0]).toMatchObject({
          id: 'component-a',
          content: 'Updated hero copy',
        }),
      { timeout: 1000 }
    );
    expect(result.current.hasUnsavedChanges).toBe(true);

    await waitFor(
      () =>
        expect(api.put).toHaveBeenCalledWith('/templates/template-1/pages/page-home', {
          sections: expect.arrayContaining([
            expect.objectContaining({
              id: 'section-home',
              components: expect.arrayContaining([
                expect.objectContaining({
                  id: 'component-a',
                  content: 'Updated hero copy',
                }),
              ]),
            }),
          ]),
        }),
      { timeout: 4500 }
    );
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('reorders existing components and adds palette components into the hovered section', async () => {
    const store = createStore();
    const { result } = renderHook(() => usePageEditorController(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.currentPage?.id).toBe('page-home');

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'component-b' },
        over: { id: 'component-a' },
      } as never);
    });

    await waitFor(() =>
      expect(
        result.current.historySections[0].components.map((component) => component.id)
      ).toEqual(['component-b', 'component-a'])
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'palette-heading' },
        over: { id: 'component-component-a' },
      } as never);
    });

    await waitFor(() => expect(result.current.historySections[0].components).toHaveLength(3));
    expect(
      result.current.historySections[0].components.some(
        (component) => component.type === 'heading'
      )
    ).toBe(true);
    expect(result.current.selectedComponent?.type).toBe('heading');
  });

  it('loads site context from a website builder route and resolves the linked template', async () => {
    const store = createStore();
    vi.mocked(websitesApiClient.getOverview).mockResolvedValueOnce({
      site: {
        id: 'site-9',
        name: 'Neighborhood Mutual Aid',
        status: 'published',
        blocked: false,
        templateId: 'template-1',
      },
      template: {
        id: 'template-1',
      },
      deployment: {
        primaryUrl: 'https://example.org',
        previewUrl: 'https://preview.example.org',
      },
    } as never);
    const { result } = renderHook(() => usePageEditorController(), {
      wrapper: createWrapper(store, {
        initialEntries: ['/websites/site-9/builder'],
        routePath: '/websites/:siteId/builder',
      }),
    });

    await waitFor(() => expect(websitesApiClient.getOverview).toHaveBeenCalledWith('site-9', 30));
    await waitFor(() =>
      expect(result.current.siteContext).toMatchObject({
        siteId: 'site-9',
        siteName: 'Neighborhood Mutual Aid',
        siteStatus: 'published',
        blocked: false,
        primaryUrl: 'https://example.org',
        previewUrl: 'https://preview.example.org',
        templateId: 'template-1',
      })
    );
    expect(result.current.resolvedTemplateId).toBe('template-1');
  });
});
