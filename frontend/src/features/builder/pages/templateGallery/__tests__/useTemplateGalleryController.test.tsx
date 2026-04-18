import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTemplateGalleryController } from '../useTemplateGalleryController';

const {
  clearErrorMock,
  createTemplateMock,
  createTemplateUnwrapMock,
  createWebsiteSiteMock,
  createWebsiteSiteUnwrapMock,
  deleteTemplateMock,
  dispatchMock,
  duplicateTemplateMock,
  duplicateTemplateUnwrapMock,
  fetchSystemTemplatesMock,
  navigateMock,
  publishWebsiteSiteMock,
  publishWebsiteSiteUnwrapMock,
  searchTemplatesMock,
  setSearchParamsMock,
} = vi.hoisted(() => ({
  clearErrorMock: vi.fn(),
  createTemplateMock: vi.fn(),
  createTemplateUnwrapMock: vi.fn(),
  createWebsiteSiteMock: vi.fn(),
  createWebsiteSiteUnwrapMock: vi.fn(),
  deleteTemplateMock: vi.fn(),
  dispatchMock: vi.fn(),
  duplicateTemplateMock: vi.fn(),
  duplicateTemplateUnwrapMock: vi.fn(),
  fetchSystemTemplatesMock: vi.fn(),
  navigateMock: vi.fn(),
  publishWebsiteSiteMock: vi.fn(),
  publishWebsiteSiteUnwrapMock: vi.fn(),
  searchTemplatesMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
}));

let mockState = {
  templates: {
    templates: [
      {
        id: 'template-custom-1',
        name: 'Custom Template',
        description: 'Owned template',
        category: 'multi-page',
        status: 'draft',
        isSystemTemplate: false,
        pageCount: 3,
      },
    ],
    systemTemplates: [
      {
        id: 'template-starter-1',
        name: 'Starter Template',
        description: 'Starter description',
        category: 'landing-page',
        status: 'published',
        isSystemTemplate: true,
        pageCount: 2,
      },
    ],
    searchParams: {
      search: '',
      category: undefined,
      status: undefined,
    },
    pagination: {
      page: 1,
      total: 1,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
  },
};

vi.mock('react-router-dom', async () => {
  const actual = (await vi.importActual('react-router-dom')) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../state', () => ({
  clearError: clearErrorMock,
  createTemplate: createTemplateMock,
  deleteTemplate: deleteTemplateMock,
  duplicateTemplate: duplicateTemplateMock,
  fetchSystemTemplates: fetchSystemTemplatesMock,
  searchTemplates: searchTemplatesMock,
  setSearchParams: setSearchParamsMock,
}));

vi.mock('../../../../websites/state', () => ({
  createWebsiteSite: createWebsiteSiteMock,
  publishWebsiteSite: publishWebsiteSiteMock,
}));

describe('useTemplateGalleryController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockState = {
      templates: {
        templates: [
          {
            id: 'template-custom-1',
            name: 'Custom Template',
            description: 'Owned template',
            category: 'multi-page',
            status: 'draft',
            isSystemTemplate: false,
            pageCount: 3,
          },
        ],
        systemTemplates: [
          {
            id: 'template-starter-1',
            name: 'Starter Template',
            description: 'Starter description',
            category: 'landing-page',
            status: 'published',
            isSystemTemplate: true,
            pageCount: 2,
          },
        ],
        searchParams: {
          search: '',
          category: undefined,
          status: undefined,
        },
        pagination: {
          page: 1,
          total: 1,
          totalPages: 1,
        },
        isLoading: false,
        error: null,
      },
    };

    fetchSystemTemplatesMock.mockReturnValue({ type: 'templates/fetchSystemTemplates' });
    searchTemplatesMock.mockReturnValue({ type: 'templates/search' });
    setSearchParamsMock.mockImplementation((payload) => ({
      type: 'templates/setSearchParams',
      payload,
    }));
    duplicateTemplateMock.mockImplementation((payload) => ({
      type: 'templates/duplicate',
      payload,
    }));
    deleteTemplateMock.mockImplementation((payload) => ({
      type: 'templates/delete',
      payload,
    }));
    createTemplateMock.mockImplementation((payload) => ({
      type: 'templates/create',
      payload,
    }));
    clearErrorMock.mockReturnValue({ type: 'templates/clearError' });
    createWebsiteSiteMock.mockImplementation((payload) => ({
      type: 'websites/createSite',
      payload,
    }));
    publishWebsiteSiteMock.mockImplementation((payload) => ({
      type: 'websites/publishSite',
      payload,
    }));

    duplicateTemplateUnwrapMock.mockResolvedValue({ id: 'template-copy-1' });
    createTemplateUnwrapMock.mockResolvedValue({ id: 'template-new-1' });
    createWebsiteSiteUnwrapMock.mockResolvedValue({ id: 'site-1' });
    publishWebsiteSiteUnwrapMock.mockResolvedValue({ siteId: 'site-1' });

    dispatchMock.mockImplementation((action: { type?: string }) => {
      switch (action.type) {
        case 'templates/duplicate':
          return { unwrap: duplicateTemplateUnwrapMock };
        case 'templates/create':
          return { unwrap: createTemplateUnwrapMock };
        case 'websites/createSite':
          return { unwrap: createWebsiteSiteUnwrapMock };
        case 'websites/publishSite':
          return { unwrap: publishWebsiteSiteUnwrapMock };
        default:
          return action;
      }
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loads starter templates on mount and debounces search param updates', async () => {
    const { result } = renderHook(() => useTemplateGalleryController());

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'templates/fetchSystemTemplates' })
    );

    act(() => {
      result.current.setSearchInput('community');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(setSearchParamsMock).toHaveBeenCalledWith({ search: 'community', page: 1 });
  });

  it('seeds the create-site modal from the active tab and clears stale modal state', () => {
    const { result } = renderHook(() => useTemplateGalleryController());

    act(() => {
      result.current.setNewSiteName('Old site');
      result.current.handleSelectSiteTemplate(mockState.templates.systemTemplates[0]);
    });

    act(() => {
      result.current.handleTabChange('my-templates');
    });

    act(() => {
      result.current.openCreateSiteModal();
    });

    expect(result.current.showCreateSiteModal).toBe(true);
    expect(result.current.sitePickerTab).toBe('my-templates');
    expect(result.current.newSiteName).toBe('');
    expect(result.current.selectedSiteTemplate).toBeNull();
  });

  it('duplicates starter templates before creating and publishing a new site', async () => {
    const { result } = renderHook(() => useTemplateGalleryController());
    const starterTemplate = mockState.templates.systemTemplates[0];

    act(() => {
      result.current.openCreateSiteModal();
      result.current.setNewSiteName('Community Support Hub');
      result.current.handleSelectSiteTemplate(starterTemplate);
    });

    await act(async () => {
      await result.current.handleCreateSite();
    });

    expect(duplicateTemplateMock).toHaveBeenCalledWith({
      id: 'template-starter-1',
      name: 'Community Support Hub Website Template',
    });
    expect(createWebsiteSiteMock).toHaveBeenCalledWith({
      templateId: 'template-copy-1',
      name: 'Community Support Hub',
      siteKind: 'organization',
    });
    expect(publishWebsiteSiteMock).toHaveBeenCalledWith({
      siteId: 'site-1',
      templateId: 'template-copy-1',
      target: 'live',
    });
    expect(navigateMock).toHaveBeenCalledWith('/websites/site-1/builder');
    expect(result.current.showCreateSiteModal).toBe(false);
  });
});
