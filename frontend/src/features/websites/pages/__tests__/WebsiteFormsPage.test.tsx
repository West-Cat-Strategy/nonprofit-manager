import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteFormsPage from '../WebsiteFormsPage';

const dispatchMock = vi.fn();

const thunkMocks = vi.hoisted(() => {
  const createAction = (type: string) =>
    Object.assign(
      (payload?: unknown) => ({ type, payload }),
      {
        fulfilled: {
          match: (action: { type?: string }) => action?.type === `${type}/fulfilled`,
        },
      }
    );

  return {
    clearWebsitesError: vi.fn(() => ({ type: 'websites/clearError' })),
    fetchWebsiteForms: vi.fn((payload?: unknown) => ({ type: 'websites/fetchForms', payload })),
    updateWebsiteForm: createAction('websites/updateForm'),
  };
});

const overview = {
  site: {
    id: 'site-1',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    blocked: false,
  },
};

const mockState = {
  websites: {
    forms: [
      {
        formKey: 'contact-form-1',
        componentId: 'contact-form-1',
        formType: 'contact-form',
        title: 'Contact form',
        pageId: 'page-1',
        pageName: 'Home',
        pageSlug: 'home',
        pageType: 'static',
        routePattern: '/',
        path: '/',
        live: true,
        blocked: false,
        sourceConfig: {},
        operationalSettings: {
          heading: 'Talk to us',
          successMessage: 'Old success',
          defaultTags: ['supporter'],
        },
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
    fetchWebsiteForms: thunkMocks.fetchWebsiteForms,
    updateWebsiteForm: thunkMocks.updateWebsiteForm,
  };
});

describe('WebsiteFormsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockImplementation(
      (action: { type?: string }) => Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('loads connected forms and saves operational overrides', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchForms', payload: 'site-1' })
      );
    });

    expect(screen.getByText('Connected CTAs')).toBeInTheDocument();
    expect(screen.getByText('Contact form')).toBeInTheDocument();
    expect(screen.getByText(/Public CTA: Contact \/ referral/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Success message'), {
      target: { value: 'Thanks for reaching out.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save form settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateForm',
          payload: {
            siteId: 'site-1',
            formKey: 'contact-form-1',
            data: expect.objectContaining({
              heading: 'Talk to us',
              successMessage: 'Thanks for reaching out.',
              defaultTags: ['supporter'],
            }),
          },
        })
      );
    });
    expect(screen.getByText('Form settings saved.')).toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/forms']}>
      <Routes>
        <Route path="/websites/:siteId/forms" element={<WebsiteFormsPage />} />
      </Routes>
    </MemoryRouter>
  );
}
