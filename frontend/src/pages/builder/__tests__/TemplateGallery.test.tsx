import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type * as ReactReduxModule from 'react-redux';
import type * as ReactRouterDomModule from 'react-router-dom';
import TemplateGallery from '../../../features/builder/pages/TemplateGalleryPage';

const navigateMock = vi.fn();
const dispatchMock = vi.fn();
let templateState = {
  templates: [] as Array<{ id: string; name: string; description?: string; category?: string; isSystemTemplate?: boolean }>,
  systemTemplates: [] as Array<{ id: string; name: string; description?: string; category?: string; isSystemTemplate?: boolean }>,
  searchParams: {},
  pagination: { total: 0, page: 1, totalPages: 1 },
  isLoading: false,
  error: null as string | null,
};

const templateSliceMocks = vi.hoisted(() => {
  const createTemplate = Object.assign(
    (payload: unknown) => ({ type: 'templates/create', payload, __createTemplate: true }),
    {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === 'templates/create/fulfilled',
      },
    }
  );

  return {
    createTemplate,
    searchTemplates: vi.fn(() => ({ type: 'templates/search' })),
    fetchSystemTemplates: vi.fn(() => ({ type: 'templates/fetchSystem' })),
    deleteTemplate: vi.fn(() => ({ type: 'templates/delete' })),
    duplicateTemplate: Object.assign(
      vi.fn(() => ({ type: 'templates/duplicate' })),
      {
        fulfilled: {
          match: () => false,
        },
      }
    ),
    setSearchParams: vi.fn(() => ({ type: 'templates/setSearchParams' })),
    clearError: vi.fn(() => ({ type: 'templates/clearError' })),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('react-redux', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactReduxModule>();
  return {
    ...actual,
    useDispatch: () => dispatchMock,
    useSelector: (selector: (state: unknown) => unknown) =>
      selector({ templates: templateState }),
  };
});

vi.mock('../../../features/builder/state', () => ({
  createTemplate: templateSliceMocks.createTemplate,
  searchTemplates: templateSliceMocks.searchTemplates,
  fetchSystemTemplates: templateSliceMocks.fetchSystemTemplates,
  deleteTemplate: templateSliceMocks.deleteTemplate,
  duplicateTemplate: templateSliceMocks.duplicateTemplate,
  setSearchParams: templateSliceMocks.setSearchParams,
  clearError: templateSliceMocks.clearError,
}));

describe('TemplateGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    templateState = {
      templates: [],
      systemTemplates: [],
      searchParams: {},
      pagination: { total: 0, page: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    };
    dispatchMock.mockImplementation((action: { __createTemplate?: boolean }) => {
      if (action?.__createTemplate) {
        return Promise.resolve({
          type: 'templates/create/fulfilled',
          payload: { id: 'template-123' },
        });
      }
      return Promise.resolve(action);
    });
  });

  it('creates a blank template and navigates to the editor when starting from scratch', async () => {
    render(<TemplateGallery />);

    fireEvent.click(screen.getByRole('button', { name: 'New Website' }));
    fireEvent.click(screen.getByRole('button', { name: /Start from Scratch/i }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'templates/create',
          payload: expect.objectContaining({
            name: 'Untitled Website',
            category: 'multi-page',
          }),
        })
      );
      expect(navigateMock).toHaveBeenCalledWith('/website-builder/template-123');
    });
  });

  it('opens template previews with noopener and noreferrer', async () => {
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
    templateState = {
      ...templateState,
      systemTemplates: [
        {
          id: 'template-preview-1',
          name: 'Preview Template',
          description: 'Template for previewing',
          category: 'landing-page',
          isSystemTemplate: false,
          pageCount: 1,
          tags: [],
        },
      ],
    };

    render(<TemplateGallery />);

    await waitFor(() => {
      expect(screen.getByTitle('Preview')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Preview'));

    expect(openMock).toHaveBeenCalledWith(
      '/website-builder/template-preview-1/preview',
      '_blank',
      'noopener,noreferrer'
    );

    openMock.mockRestore();
  });
});
