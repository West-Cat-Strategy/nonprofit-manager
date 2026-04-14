import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteFormsPage from '../WebsiteFormsPage';

const dispatchMock = vi.fn();

const thunkMocks = vi.hoisted(() => {
  const createAction = (type: string) =>
    Object.assign((payload?: unknown) => ({ type, payload }), {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === `${type}/fulfilled`,
      },
    });

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

const buildState = (donationProvider: 'stripe' | 'paypal' | 'square' = 'stripe') => ({
  websites: {
    overview: null,
    currentSiteData: {
      siteId: 'site-1',
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
        {
          formKey: 'donation-form-1',
          componentId: 'donation-form-1',
          formType: 'donation-form',
          title: 'Donation form',
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
            heading: 'Support the work',
            currency: 'cad',
            provider: donationProvider,
            recurringDefault: true,
            suggestedAmounts: [25, 50, 100],
          },
        },
      ],
      integrations: {
        blocked: false,
        publishStatus: 'published',
        newsletter: {
          provider: 'mautic',
          configured: true,
          selectedAudienceId: 'seg-1',
          selectedAudienceName: 'Supporters',
          selectedPresetId: null,
          listPresets: [],
          availableAudiences: [],
          audienceCount: 0,
          lastRefreshedAt: null,
          lastSyncAt: null,
        },
        mailchimp: {
          configured: false,
          availableAudiences: [],
          lastSyncAt: null,
        },
        mautic: {
          configured: true,
          availableAudiences: [],
          lastSyncAt: null,
        },
        stripe: {
          provider: donationProvider,
          configured: true,
          publishableKeyConfigured: true,
        },
        social: {
          facebook: {
            lastSyncAt: null,
            lastSyncError: null,
          },
        },
      },
      analytics: null,
    },
    isLoading: false,
    isSaving: false,
    error: null,
  },
});

let currentState = buildState();

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof currentState) => unknown) => selector(currentState),
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
    currentState = buildState();
    dispatchMock.mockImplementation((action: { type?: string }) =>
      Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
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
    const contactCard = screen.getByText('Contact form').closest('article');
    expect(contactCard).not.toBeNull();
    fireEvent.change(within(contactCard as HTMLElement).getByPlaceholderText('Success message'), {
      target: { value: 'Thanks for reaching out.' },
    });
    fireEvent.click(within(contactCard as HTMLElement).getByRole('button', { name: 'Save form settings' }));

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

  it('saves donation form provider defaults alongside the recurring checkout settings', async () => {
    currentState = buildState('paypal');
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchForms', payload: 'site-1' })
      );
    });

    fireEvent.change(screen.getByLabelText('Donation provider'), {
      target: { value: 'square' },
    });
    const donationCard = screen.getByText('Donation form').closest('article');
    expect(donationCard).not.toBeNull();
    fireEvent.change(within(donationCard as HTMLElement).getByPlaceholderText('Currency (CAD, USD)'), {
      target: { value: 'usd' },
    });
    fireEvent.click(
      within(donationCard as HTMLElement).getByRole('button', { name: 'Save form settings' })
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateForm',
          payload: {
            siteId: 'site-1',
            formKey: 'donation-form-1',
            data: expect.objectContaining({
              heading: 'Support the work',
              currency: 'usd',
              provider: 'square',
              recurringDefault: true,
            }),
          },
        })
      );
    });
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
