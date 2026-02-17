import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import templatesReducer, {
  searchTemplates,
  fetchSystemTemplates,
  fetchTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  createTemplatePage,
  updateTemplatePage,
  deleteTemplatePage,
  fetchTemplateVersions,
  createTemplateVersion,
  restoreTemplateVersion,
  clearError,
  setSearchParams,
  setCurrentPage,
  clearCurrentTemplate,
} from '../templateSlice';
import api from '../../../services/api';
import type { TemplateState, Template, TemplateListItem, TemplatePage } from '../../../types/websiteBuilder';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('templateSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const initialState: TemplateState = {
    templates: [],
    systemTemplates: [],
    currentTemplate: null,
    currentPage: null,
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
  };

  const mockTemplate: Template = {
    id: 'template_1',
    userId: 'user_1',
    name: 'Test Template',
    description: 'A test template',
    category: 'landing-page',
    tags: ['test'],
    status: 'draft',
    isSystemTemplate: false,
    theme: {
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textMuted: '#64748b',
        border: '#e2e8f0',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      typography: {
        fontFamily: 'Inter',
        headingFontFamily: 'Inter',
        baseFontSize: '16px',
        lineHeight: '1.5',
        headingLineHeight: '1.2',
        fontWeightNormal: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,
      },
      spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', xxl: '3rem' },
      borderRadius: { sm: '0.25rem', md: '0.5rem', lg: '1rem', full: '9999px' },
      shadows: { sm: '', md: '', lg: '', xl: '' },
    },
    globalSettings: {
      language: 'en',
      header: { navigation: [] },
      footer: { columns: [] },
    },
    pages: [
      {
        id: 'page_1',
        name: 'Home',
        slug: 'home',
        isHomepage: true,
        seo: { title: 'Home', description: '' },
        sections: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ],
    metadata: { version: '1.0.0' },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockTemplateListItem: TemplateListItem = {
    id: 'template_1',
    name: 'Test Template',
    description: 'A test template',
    category: 'landing-page',
    tags: ['test'],
    status: 'draft',
    isSystemTemplate: false,
    pageCount: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: { templates: templatesReducer },
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = store.getState().templates;
      expect(state.templates).toEqual([]);
      expect(state.systemTemplates).toEqual([]);
      expect(state.currentTemplate).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Synchronous Actions', () => {
    it('clearError clears the error', () => {
      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: { ...initialState, error: 'Some error' },
        },
      });

      store.dispatch(clearError());
      expect(store.getState().templates.error).toBeNull();
    });

    it('setSearchParams updates search parameters', () => {
      store.dispatch(setSearchParams({ search: 'test', category: 'event' }));

      const state = store.getState().templates;
      expect(state.searchParams.search).toBe('test');
      expect(state.searchParams.category).toBe('event');
    });

    it('setCurrentPage sets the current page', () => {
      const page: TemplatePage = {
        id: 'page_1',
        name: 'Test Page',
        slug: 'test',
        isHomepage: false,
        seo: { title: 'Test', description: '' },
        sections: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      store.dispatch(setCurrentPage(page));
      expect(store.getState().templates.currentPage).toEqual(page);
    });

    it('clearCurrentTemplate clears template and page', () => {
      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: {
            ...initialState,
            currentTemplate: mockTemplate,
            currentPage: mockTemplate.pages[0],
          },
        },
      });

      store.dispatch(clearCurrentTemplate());

      const state = store.getState().templates;
      expect(state.currentTemplate).toBeNull();
      expect(state.currentPage).toBeNull();
    });
  });

  describe('searchTemplates', () => {
    it('fetches templates successfully', async () => {
      const mockResponse = {
        templates: [mockTemplateListItem],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      await store.dispatch(searchTemplates(undefined));

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/templates'));
      expect(store.getState().templates.templates).toEqual([mockTemplateListItem]);
      expect(store.getState().templates.pagination.total).toBe(1);
    });

    it('handles search error', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await store.dispatch(searchTemplates(undefined));

      expect(store.getState().templates.error).toBe('Network error');
      expect(store.getState().templates.isLoading).toBe(false);
    });
  });

  describe('fetchSystemTemplates', () => {
    it('fetches system templates successfully', async () => {
      const systemTemplate = { ...mockTemplateListItem, isSystemTemplate: true };
      mockApi.get.mockResolvedValue({ data: [systemTemplate] });

      await store.dispatch(fetchSystemTemplates());

      expect(mockApi.get).toHaveBeenCalledWith('/templates/system');
      expect(store.getState().templates.systemTemplates).toEqual([systemTemplate]);
    });
  });

  describe('fetchTemplate', () => {
    it('fetches a template and sets current page', async () => {
      mockApi.get.mockResolvedValue({ data: mockTemplate });

      await store.dispatch(fetchTemplate('template_1'));

      expect(mockApi.get).toHaveBeenCalledWith('/templates/template_1');
      expect(store.getState().templates.currentTemplate).toEqual(mockTemplate);
      expect(store.getState().templates.currentPage).toEqual(mockTemplate.pages[0]);
    });

    it('handles fetch error', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await store.dispatch(fetchTemplate('invalid'));

      expect(store.getState().templates.error).toBe('Not found');
    });
  });

  describe('createTemplate', () => {
    it('creates template successfully', async () => {
      mockApi.post.mockResolvedValue({ data: mockTemplate });

      await store.dispatch(
        createTemplate({
          name: 'Test Template',
          category: 'landing-page',
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/templates', {
        name: 'Test Template',
        category: 'landing-page',
      });
      expect(store.getState().templates.currentTemplate).toEqual(mockTemplate);
      expect(store.getState().templates.templates[0].id).toBe('template_1');
    });
  });

  describe('updateTemplate', () => {
    it('updates template successfully', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Name' };
      mockApi.put.mockResolvedValue({ data: updatedTemplate });

      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: { ...initialState, templates: [mockTemplateListItem] },
        },
      });

      await store.dispatch(
        updateTemplate({
          id: 'template_1',
          data: { name: 'Updated Name' },
        })
      );

      expect(store.getState().templates.currentTemplate?.name).toBe('Updated Name');
      expect(store.getState().templates.templates[0].name).toBe('Updated Name');
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template successfully', async () => {
      mockApi.delete.mockResolvedValue({});

      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: { ...initialState, templates: [mockTemplateListItem] },
        },
      });

      await store.dispatch(deleteTemplate('template_1'));

      expect(store.getState().templates.templates).toHaveLength(0);
    });
  });

  describe('duplicateTemplate', () => {
    it('duplicates template successfully', async () => {
      const duplicatedTemplate = { ...mockTemplate, id: 'template_2', name: 'Test Template (Copy)' };
      mockApi.post.mockResolvedValue({ data: duplicatedTemplate });

      await store.dispatch(duplicateTemplate({ id: 'template_1' }));

      expect(mockApi.post).toHaveBeenCalledWith('/templates/template_1/duplicate', {});
      expect(store.getState().templates.templates[0].id).toBe('template_2');
    });
  });

  describe('Page Operations', () => {
    it('creates page successfully', async () => {
      const newPage: TemplatePage = {
        id: 'page_2',
        name: 'About',
        slug: 'about',
        isHomepage: false,
        seo: { title: 'About', description: '' },
        sections: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockApi.post.mockResolvedValue({ data: newPage });

      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: { ...initialState, currentTemplate: mockTemplate },
        },
      });

      await store.dispatch(
        createTemplatePage({
          templateId: 'template_1',
          data: { name: 'About', slug: 'about' },
        })
      );

      expect(store.getState().templates.currentTemplate?.pages).toHaveLength(2);
      expect(store.getState().templates.currentPage).toEqual(newPage);
    });

    it('updates page successfully', async () => {
      const updatedPage = { ...mockTemplate.pages[0], name: 'Updated Home' };
      mockApi.put.mockResolvedValue({ data: updatedPage });

      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: {
            ...initialState,
            currentTemplate: mockTemplate,
            currentPage: mockTemplate.pages[0],
          },
        },
      });

      await store.dispatch(
        updateTemplatePage({
          templateId: 'template_1',
          pageId: 'page_1',
          data: { name: 'Updated Home' },
        })
      );

      expect(store.getState().templates.currentPage?.name).toBe('Updated Home');
    });

    it('deletes page successfully', async () => {
      const templateWithTwoPages = {
        ...mockTemplate,
        pages: [
          mockTemplate.pages[0],
          {
            id: 'page_2',
            name: 'About',
            slug: 'about',
            isHomepage: false,
            seo: { title: 'About', description: '' },
            sections: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ],
      };

      mockApi.delete.mockResolvedValue({});

      store = configureStore({
        reducer: { templates: templatesReducer },
        preloadedState: {
          templates: {
            ...initialState,
            currentTemplate: templateWithTwoPages,
            currentPage: templateWithTwoPages.pages[1],
          },
        },
      });

      await store.dispatch(
        deleteTemplatePage({
          templateId: 'template_1',
          pageId: 'page_2',
        })
      );

      expect(store.getState().templates.currentTemplate?.pages).toHaveLength(1);
    });
  });

  describe('Version Operations', () => {
    it('fetches versions successfully', async () => {
      const versions = [
        { id: 'v1', templateId: 'template_1', version: '1.0.0', createdAt: '2024-01-01', snapshot: {} },
      ];
      mockApi.get.mockResolvedValue({ data: versions });

      await store.dispatch(fetchTemplateVersions('template_1'));

      expect(store.getState().templates.versions).toEqual(versions);
    });

    it('creates version successfully', async () => {
      const newVersion = {
        id: 'v2',
        templateId: 'template_1',
        version: '1.0.1',
        changes: 'Updated content',
        createdAt: '2024-01-02',
        snapshot: {},
      };
      mockApi.post.mockResolvedValue({ data: newVersion });

      await store.dispatch(
        createTemplateVersion({
          templateId: 'template_1',
          changes: 'Updated content',
        })
      );

      expect(store.getState().templates.versions[0]).toEqual(newVersion);
    });

    it('restores version successfully', async () => {
      const restoredTemplate = { ...mockTemplate, name: 'Restored Template' };
      mockApi.post.mockResolvedValue({ data: restoredTemplate });

      await store.dispatch(
        restoreTemplateVersion({
          templateId: 'template_1',
          versionId: 'v1',
        })
      );

      expect(store.getState().templates.currentTemplate?.name).toBe('Restored Template');
    });
  });
});
