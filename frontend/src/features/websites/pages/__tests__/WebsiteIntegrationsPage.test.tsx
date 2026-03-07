import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteIntegrationsPage from '../WebsiteIntegrationsPage';

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
    fetchWebsiteIntegrations: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchIntegrations',
      payload,
    })),
    updateWebsiteMailchimpIntegration: createAction('websites/updateMailchimpIntegration'),
    updateWebsiteStripeIntegration: createAction('websites/updateStripeIntegration'),
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
    integrations: {
      blocked: false,
      publishStatus: 'published',
      mailchimp: {
        audienceId: 'aud-1',
        audienceMode: 'both',
        defaultTags: ['members'],
        syncEnabled: true,
        configured: true,
        availableAudiences: [
          { id: 'aud-1', name: 'Main Audience' },
          { id: 'aud-2', name: 'Volunteers' },
        ],
        lastSyncAt: null,
      },
      stripe: {
        accountId: 'org-1',
        currency: 'cad',
        suggestedAmounts: [20, 40, 80],
        recurringDefault: true,
        campaignId: 'spring-drive',
        configured: true,
        publishableKeyConfigured: true,
      },
    },
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
    fetchWebsiteIntegrations: thunkMocks.fetchWebsiteIntegrations,
    updateWebsiteMailchimpIntegration: thunkMocks.updateWebsiteMailchimpIntegration,
    updateWebsiteStripeIntegration: thunkMocks.updateWebsiteStripeIntegration,
  };
});

describe('WebsiteIntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockImplementation(
      (action: { type?: string }) => Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('loads integration status and saves Mailchimp and Stripe defaults', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchIntegrations', payload: 'site-1' })
      );
    });

    fireEvent.change(screen.getByPlaceholderText('Default tags (comma separated)'), {
      target: { value: 'members, donors' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Mailchimp settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateMailchimpIntegration',
          payload: {
            siteId: 'site-1',
            data: expect.objectContaining({
              audienceId: 'aud-1',
              audienceMode: 'both',
              defaultTags: ['members', 'donors'],
              syncEnabled: true,
            }),
          },
        })
      );
    });
    expect(screen.getByText('Mailchimp settings saved.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Currency'), {
      target: { value: 'usd' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Stripe settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateStripeIntegration',
          payload: {
            siteId: 'site-1',
            data: expect.objectContaining({
              accountId: 'org-1',
              currency: 'usd',
              suggestedAmounts: [20, 40, 80],
              recurringDefault: true,
              campaignId: 'spring-drive',
            }),
          },
        })
      );
    });
    expect(screen.getByText('Stripe settings saved.')).toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/integrations']}>
      <Routes>
        <Route path="/websites/:siteId/integrations" element={<WebsiteIntegrationsPage />} />
      </Routes>
    </MemoryRouter>
  );
}
