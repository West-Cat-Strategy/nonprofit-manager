import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../../../services/api';
import type { PageSection, Template, TemplatePage } from '../../../types/websiteBuilder';
import reducer, {
  createTemplatePage,
  deleteTemplatePage,
  fetchTemplate,
  reorderTemplatePages,
  updateCurrentPageSections,
} from './templateCore';

const createSection = (
  id: string,
  componentId: string,
  content: string
): PageSection =>
  ({
    id,
    name: `Section ${id}`,
    components: [
      {
        id: componentId,
        type: 'text',
        content,
        align: 'left',
      },
    ],
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
    sections: [createSection('section-home', 'component-home', 'Welcome home')],
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
        sections: [createSection('section-about', 'component-about', 'About us')],
      }),
    ],
    metadata: {
      version: '1.0.0',
      thumbnailImage: 'thumb.png',
    },
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
  }) as Template;

const createStore = () =>
  configureStore({
    reducer: {
      templates: reducer,
    },
  });

describe('templateCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates the homepage as the active page and mirrors section edits into template state', async () => {
    const template = createTemplate();
    vi.mocked(api.get).mockResolvedValueOnce({ data: template });

    const store = createStore();
    await store.dispatch(fetchTemplate(template.id));

    expect(api.get).toHaveBeenCalledWith('/templates/template-1');
    expect(store.getState().templates.currentPage?.id).toBe('page-home');

    const updatedSections = [
      createSection('section-home', 'component-home', 'Updated welcome copy'),
      createSection('section-secondary', 'component-secondary', 'Secondary section'),
    ];

    store.dispatch(updateCurrentPageSections(updatedSections));

    expect(store.getState().templates.currentPage?.sections).toEqual(updatedSections);
    expect(
      store
        .getState()
        .templates.currentTemplate?.pages.find((page) => page.id === 'page-home')?.sections
    ).toEqual(updatedSections);
  });

  it('selects newly created pages and falls back to the first remaining page after delete', () => {
    const template = createTemplate();
    const stateWithTemplate = reducer(
      undefined,
      fetchTemplate.fulfilled(template, 'request-1', template.id)
    );

    const newPage = createPage({
      id: 'page-contact',
      name: 'Contact',
      slug: 'contact',
      isHomepage: false,
      routePattern: '/contact',
      sections: [],
    });

    const stateWithCreatedPage = reducer(
      stateWithTemplate,
      createTemplatePage.fulfilled(newPage, 'request-2', {
        templateId: template.id,
        data: {
          name: 'Contact',
          slug: 'contact',
        },
      })
    );

    expect(stateWithCreatedPage.currentPage?.id).toBe('page-contact');
    expect(stateWithCreatedPage.currentTemplate?.pages.at(-1)?.id).toBe('page-contact');

    const stateAfterDelete = reducer(
      stateWithCreatedPage,
      deleteTemplatePage.fulfilled(
        { templateId: template.id, pageId: 'page-contact' },
        'request-3',
        { templateId: template.id, pageId: 'page-contact' }
      )
    );

    expect(stateAfterDelete.currentTemplate?.pages.map((page) => page.id)).not.toContain(
      'page-contact'
    );
    expect(stateAfterDelete.currentPage?.id).toBe('page-home');
  });

  it('sends page reorder requests and surfaces reorder failures as rejected payloads', async () => {
    const store = createStore();
    vi.mocked(api.put).mockResolvedValueOnce({ data: undefined });

    const successAction = await store.dispatch(
      reorderTemplatePages({
        templateId: 'template-1',
        pageIds: ['page-about', 'page-home'],
      })
    );

    expect(successAction.meta.requestStatus).toBe('fulfilled');
    expect(api.put).toHaveBeenCalledWith('/templates/template-1/pages/reorder', {
      pageIds: ['page-about', 'page-home'],
    });

    vi.mocked(api.put).mockRejectedValueOnce(new Error('Unable to reorder pages'));

    const failedAction = await store.dispatch(
      reorderTemplatePages({
        templateId: 'template-1',
        pageIds: ['page-home', 'page-about'],
      })
    );

    expect(failedAction.meta.requestStatus).toBe('rejected');
    expect(failedAction.payload).toBe('Unable to reorder pages');
  });
});
