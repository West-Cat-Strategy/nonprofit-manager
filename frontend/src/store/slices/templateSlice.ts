/**
 * Template Slice
 * Redux state management for website builder templates
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { formatApiErrorMessage } from '../../utils/apiError';
import type {
  TemplateState,
  Template,
  TemplateListItem,
  TemplatePage,
  TemplateVersion,
  TemplateSearchParams,
  TemplateSearchResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreatePageRequest,
  UpdatePageRequest,
  PageSection,
} from '../../types/websiteBuilder';

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

// ==================== Async Thunks ====================

/**
 * Search and list templates
 */
export const searchTemplates = createAsyncThunk<
  TemplateSearchResponse,
  TemplateSearchParams | undefined
>(
  'templates/search',
  async (params, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { templates: TemplateState };
      const searchParams = params || state.templates.searchParams;

      const queryParams = new URLSearchParams();
      if (searchParams.search) queryParams.set('search', searchParams.search);
      if (searchParams.category) queryParams.set('category', searchParams.category);
      if (searchParams.tags?.length) queryParams.set('tags', searchParams.tags.join(','));
      if (searchParams.status) queryParams.set('status', searchParams.status);
      if (typeof searchParams.isSystemTemplate === 'boolean') {
        queryParams.set('isSystemTemplate', String(searchParams.isSystemTemplate));
      }
      if (searchParams.page) queryParams.set('page', String(searchParams.page));
      if (searchParams.limit) queryParams.set('limit', String(searchParams.limit));
      if (searchParams.sortBy) queryParams.set('sortBy', searchParams.sortBy);
      if (searchParams.sortOrder) queryParams.set('sortOrder', searchParams.sortOrder);

      const response = await api.get(`/templates?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Network error');
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch system templates
 */
export const fetchSystemTemplates = createAsyncThunk<TemplateListItem[]>(
  'templates/fetchSystem',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/templates/system');
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to fetch system templates');
      return rejectWithValue(message);
    }
  }
);

/**
 * Get a specific template
 */
export const fetchTemplate = createAsyncThunk<Template, string>(
  'templates/fetch',
  async (templateId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Not found');
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new template
 */
export const createTemplate = createAsyncThunk<Template, CreateTemplateRequest>(
  'templates/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/templates', data);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to create template');
      return rejectWithValue(message);
    }
  }
);

/**
 * Update a template
 */
export const updateTemplate = createAsyncThunk<
  Template,
  { id: string; data: UpdateTemplateRequest }
>(
  'templates/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/templates/${id}`, data);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to update template');
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete a template
 */
export const deleteTemplate = createAsyncThunk<string, string>(
  'templates/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/templates/${id}`);
      return id;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to delete template');
      return rejectWithValue(message);
    }
  }
);

/**
 * Duplicate a template
 */
export const duplicateTemplate = createAsyncThunk<
  Template,
  { id: string; name?: string }
>(
  'templates/duplicate',
  async ({ id, name }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/templates/${id}/duplicate`, { name });
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to duplicate template');
      return rejectWithValue(message);
    }
  }
);

// ==================== Page Thunks ====================

/**
 * Create a new page
 */
export const createTemplatePage = createAsyncThunk<
  TemplatePage,
  { templateId: string; data: CreatePageRequest }
>(
  'templates/createPage',
  async ({ templateId, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/templates/${templateId}/pages`, data);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to create template page');
      return rejectWithValue(message);
    }
  }
);

/**
 * Update a page
 */
export const updateTemplatePage = createAsyncThunk<
  TemplatePage,
  { templateId: string; pageId: string; data: UpdatePageRequest }
>(
  'templates/updatePage',
  async ({ templateId, pageId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/templates/${templateId}/pages/${pageId}`, data);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to update template page');
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete a page
 */
export const deleteTemplatePage = createAsyncThunk<
  { templateId: string; pageId: string },
  { templateId: string; pageId: string }
>(
  'templates/deletePage',
  async ({ templateId, pageId }, { rejectWithValue }) => {
    try {
      await api.delete(`/templates/${templateId}/pages/${pageId}`);
      return { templateId, pageId };
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to delete template page');
      return rejectWithValue(message);
    }
  }
);

/**
 * Reorder pages
 */
export const reorderTemplatePages = createAsyncThunk<
  void,
  { templateId: string; pageIds: string[] }
>(
  'templates/reorderPages',
  async ({ templateId, pageIds }, { rejectWithValue }) => {
    try {
      await api.put(`/templates/${templateId}/pages/reorder`, { pageIds });
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to reorder template pages');
      return rejectWithValue(message);
    }
  }
);

// ==================== Version Thunks ====================

/**
 * Fetch version history
 */
export const fetchTemplateVersions = createAsyncThunk<
  TemplateVersion[],
  string
>(
  'templates/fetchVersions',
  async (templateId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/templates/${templateId}/versions`);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to fetch template versions');
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new version
 */
export const createTemplateVersion = createAsyncThunk<
  TemplateVersion,
  { templateId: string; changes?: string }
>(
  'templates/createVersion',
  async ({ templateId, changes }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/templates/${templateId}/versions`, { changes });
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to create template version');
      return rejectWithValue(message);
    }
  }
);

/**
 * Restore a version
 */
export const restoreTemplateVersion = createAsyncThunk<
  Template,
  { templateId: string; versionId: string }
>(
  'templates/restoreVersion',
  async ({ templateId, versionId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/templates/${templateId}/versions/${versionId}/restore`);
      return response.data;
    } catch (error) {
      const message = formatApiErrorMessage(error, 'Failed to restore template version');
      return rejectWithValue(message);
    }
  }
);

// ==================== Slice ====================

const templateSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSearchParams: (state, action: PayloadAction<Partial<TemplateSearchParams>>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    setCurrentPage: (state, action: PayloadAction<TemplatePage | null>) => {
      state.currentPage = action.payload;
    },
    updateCurrentPageSections: (state, action: PayloadAction<PageSection[]>) => {
      if (state.currentPage) {
        state.currentPage.sections = action.payload;
      }
      if (state.currentTemplate && state.currentPage) {
        const pageIndex = state.currentTemplate.pages.findIndex(
          (p) => p.id === state.currentPage?.id
        );
        if (pageIndex !== -1) {
          state.currentTemplate.pages[pageIndex].sections = action.payload;
        }
      }
    },
    clearCurrentTemplate: (state) => {
      state.currentTemplate = null;
      state.currentPage = null;
      state.versions = [];
    },
  },
  extraReducers: (builder) => {
    // Search templates
    builder
      .addCase(searchTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = action.payload.templates;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(searchTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch system templates
    builder
      .addCase(fetchSystemTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSystemTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.systemTemplates = action.payload;
      })
      .addCase(fetchSystemTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch template
    builder
      .addCase(fetchTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTemplate = action.payload;
        // Set homepage as current page by default
        const homepage = action.payload.pages.find((p) => p.isHomepage);
        state.currentPage = homepage || action.payload.pages[0] || null;
      })
      .addCase(fetchTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create template
    builder
      .addCase(createTemplate.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.isSaving = false;
        state.currentTemplate = action.payload;
        // Add to list
        state.templates.unshift({
          id: action.payload.id,
          name: action.payload.name,
          description: action.payload.description,
          category: action.payload.category,
          tags: action.payload.tags,
          status: action.payload.status,
          isSystemTemplate: action.payload.isSystemTemplate,
          thumbnailImage: action.payload.metadata.thumbnailImage,
          pageCount: action.payload.pages.length,
          createdAt: action.payload.createdAt,
          updatedAt: action.payload.updatedAt,
        });
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    // Update template
    builder
      .addCase(updateTemplate.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.isSaving = false;
        state.currentTemplate = action.payload;
        // Update in list
        const index = state.templates.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.templates[index] = {
            ...state.templates[index],
            name: action.payload.name,
            description: action.payload.description,
            category: action.payload.category,
            tags: action.payload.tags,
            status: action.payload.status,
            updatedAt: action.payload.updatedAt,
          };
        }
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    // Delete template
    builder
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter((t) => t.id !== action.payload);
        if (state.currentTemplate?.id === action.payload) {
          state.currentTemplate = null;
          state.currentPage = null;
        }
      });

    // Duplicate template
    builder
      .addCase(duplicateTemplate.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(duplicateTemplate.fulfilled, (state, action) => {
        state.isSaving = false;
        state.templates.unshift({
          id: action.payload.id,
          name: action.payload.name,
          description: action.payload.description,
          category: action.payload.category,
          tags: action.payload.tags,
          status: action.payload.status,
          isSystemTemplate: action.payload.isSystemTemplate,
          thumbnailImage: action.payload.metadata.thumbnailImage,
          pageCount: action.payload.pages.length,
          createdAt: action.payload.createdAt,
          updatedAt: action.payload.updatedAt,
        });
      })
      .addCase(duplicateTemplate.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    // Create page
    builder
      .addCase(createTemplatePage.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createTemplatePage.fulfilled, (state, action) => {
        state.isSaving = false;
        if (state.currentTemplate) {
          state.currentTemplate.pages.push(action.payload);
        }
        state.currentPage = action.payload;
      })
      .addCase(createTemplatePage.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    // Update page
    builder
      .addCase(updateTemplatePage.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateTemplatePage.fulfilled, (state, action) => {
        state.isSaving = false;
        if (state.currentTemplate) {
          const index = state.currentTemplate.pages.findIndex(
            (p) => p.id === action.payload.id
          );
          if (index !== -1) {
            state.currentTemplate.pages[index] = action.payload;
          }
        }
        if (state.currentPage?.id === action.payload.id) {
          state.currentPage = action.payload;
        }
      })
      .addCase(updateTemplatePage.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    // Delete page
    builder
      .addCase(deleteTemplatePage.fulfilled, (state, action) => {
        if (state.currentTemplate) {
          state.currentTemplate.pages = state.currentTemplate.pages.filter(
            (p) => p.id !== action.payload.pageId
          );
        }
        if (state.currentPage?.id === action.payload.pageId) {
          state.currentPage = state.currentTemplate?.pages[0] || null;
        }
      });

    // Fetch versions
    builder
      .addCase(fetchTemplateVersions.fulfilled, (state, action) => {
        state.versions = action.payload;
      });

    // Create version
    builder
      .addCase(createTemplateVersion.fulfilled, (state, action) => {
        state.versions.unshift(action.payload);
      });

    // Restore version
    builder
      .addCase(restoreTemplateVersion.fulfilled, (state, action) => {
        state.currentTemplate = action.payload;
        const homepage = action.payload.pages.find((p) => p.isHomepage);
        state.currentPage = homepage || action.payload.pages[0] || null;
      });
  },
});

export const {
  clearError,
  setSearchParams,
  setCurrentPage,
  updateCurrentPageSections,
  clearCurrentTemplate,
} = templateSlice.actions;

export default templateSlice.reducer;