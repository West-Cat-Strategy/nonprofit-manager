import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageEditor from '../../../features/builder/pages/PageEditorPage';
import { updateCurrentPageSections, setCurrentPage } from '../../../features/builder/state';
import { createTestStore, renderWithProviders } from '../../../test/testUtils';
import type { RootState } from '../../../store';

vi.mock('../../../components/editor', () => ({
  EditorHeader: () => <div>Editor Header</div>,
  ComponentPalette: () => <div>Component Palette</div>,
  EditorCanvas: () => <div>Editor Canvas</div>,
  PropertyPanel: () => <div>Property Panel</div>,
  PageList: () => <div>Page List</div>,
}));

vi.mock('../../../hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveNow: vi.fn(),
  }),
}));

describe('PageEditor state synchronization', () => {
  it('does not enter a loop when the store rehydrates with equivalent sections', async () => {
    const preloadedState = {
      templates: {
        templates: [],
        systemTemplates: [],
        currentTemplate: {
          id: 'template-1',
          userId: 'user-1',
          name: 'Template',
          description: '',
          category: 'landing-page',
          tags: [],
          status: 'draft',
          isSystemTemplate: false,
          theme: {
            colors: {
              primary: '#000000',
              secondary: '#111111',
              accent: '#222222',
              background: '#ffffff',
              surface: '#f5f5f5',
              text: '#000000',
              textMuted: '#666666',
              border: '#dddddd',
              error: '#cc0000',
              success: '#00aa00',
              warning: '#ffaa00',
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
          pages: [
            {
              id: 'page-1',
              name: 'Home',
              slug: 'home',
              isHomepage: true,
              pageType: 'static',
              routePattern: '/',
              seo: {
                title: 'Home',
                description: 'Home page',
              },
              sections: [],
              createdAt: '2026-03-11T00:00:00.000Z',
              updatedAt: '2026-03-11T00:00:00.000Z',
            },
          ],
          metadata: {
            version: '1.0.0',
          },
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
        },
        currentPage: {
          id: 'page-1',
          name: 'Home',
          slug: 'home',
          isHomepage: true,
          pageType: 'static',
          routePattern: '/',
          seo: {
            title: 'Home',
            description: 'Home page',
          },
          sections: [],
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
        },
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

    const store = createTestStore(preloadedState);
    const dispatchSpy = vi.spyOn(store, 'dispatch');

    renderWithProviders(<PageEditor />, { store });

    await waitFor(() => {
      expect(screen.getByText('Editor Canvas')).toBeInTheDocument();
    });

    act(() => {
      store.dispatch(
        setCurrentPage({
          ...preloadedState.templates.currentPage,
          sections: [],
        })
      );
    });

    await waitFor(() => {
      const updateCalls = dispatchSpy.mock.calls.filter(
        ([action]) => typeof action === 'object' && action !== null && action.type === updateCurrentPageSections.type
      );
      expect(updateCalls).toHaveLength(0);
    });
  });
});
