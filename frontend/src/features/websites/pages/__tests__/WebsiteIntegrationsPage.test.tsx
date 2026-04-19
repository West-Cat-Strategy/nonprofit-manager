import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteIntegrationsPage from '../WebsiteIntegrationsPage';

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
    fetchWebsiteIntegrations: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchIntegrations',
      payload,
    })),
    updateWebsiteNewsletterIntegration: createAction('websites/updateNewsletterIntegration'),
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

const buildState = (provider: 'mautic' | 'mailchimp', donationProvider: 'stripe' | 'paypal' | 'square' = 'stripe') => ({
  websites: {
    overview: null,
    currentSiteData: {
      siteId: 'site-1',
      forms: [],
      integrations: {
        blocked: false,
        publishStatus: 'published',
        newsletter: {
          provider,
          configured: true,
          lastSyncAt: null,
        },
        mailchimp: {
          audienceId: 'aud-1',
          audienceMode: 'both',
          defaultTags: ['members'],
          syncEnabled: true,
          configured: provider === 'mailchimp',
          accountName: provider === 'mailchimp' ? 'Mailchimp Account' : undefined,
          listCount: provider === 'mailchimp' ? 2 : undefined,
          availableAudiences:
            provider === 'mailchimp'
              ? [
                  { id: 'aud-1', name: 'Main Audience' },
                  { id: 'aud-2', name: 'Volunteers' },
                ]
              : [],
          lastSyncAt: null,
        },
        mautic: {
          baseUrl: 'https://mautic.example.org',
          segmentId: 'seg-1',
          username: 'api-user',
          password: 'api-pass',
          defaultTags: ['supporters'],
          syncEnabled: provider === 'mautic',
          configured: provider === 'mautic',
          availableAudiences:
            provider === 'mautic'
              ? [
                  { id: 'seg-1', name: 'Newsletter Supporters' },
                  { id: 'seg-2', name: 'Monthly Donors' },
                ]
              : [],
          segmentCount: provider === 'mautic' ? 2 : undefined,
          lastSyncAt: null,
        },
        stripe: {
          accountId: 'org-1',
          provider: donationProvider,
          currency: 'cad',
          suggestedAmounts: [20, 40, 80],
          recurringDefault: true,
          campaignId: 'spring-drive',
          configured: true,
          publishableKeyConfigured: true,
        },
      },
      analytics: null,
    },
    isLoading: false,
    isSaving: false,
    error: null,
  },
});

let currentState = buildState('mautic');

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
    fetchWebsiteIntegrations: thunkMocks.fetchWebsiteIntegrations,
    updateWebsiteNewsletterIntegration: thunkMocks.updateWebsiteNewsletterIntegration,
    updateWebsiteStripeIntegration: thunkMocks.updateWebsiteStripeIntegration,
  };
});

describe('WebsiteIntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState = buildState('mautic', 'paypal');
    dispatchMock.mockImplementation((action: { type?: string }) =>
      Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('loads integration status and saves donation provider defaults', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchIntegrations', payload: 'site-1' })
      );
    });

    expect(screen.getByRole('heading', { name: 'Newsletter provider' })).toBeInTheDocument();
    expect(screen.getByLabelText('Newsletter provider')).toHaveValue('mautic');
    expect(screen.getByLabelText('Donation provider')).toHaveValue('paypal');

    fireEvent.change(screen.getByLabelText('Mautic segment ID'), {
      target: { value: 'seg-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save newsletter settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateNewsletterIntegration',
          payload: {
            siteId: 'site-1',
            data: {
              provider: 'mautic',
              mautic: expect.objectContaining({
                baseUrl: 'https://mautic.example.org',
                segmentId: 'seg-2',
                username: 'api-user',
                password: 'api-pass',
                defaultTags: ['supporters'],
                syncEnabled: true,
              }),
            },
          },
        })
      );
    });
    expect(thunkMocks.fetchWebsiteIntegrations).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Mautic settings saved.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Donation provider'), {
      target: { value: 'square' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save donation settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateStripeIntegration',
          payload: {
            siteId: 'site-1',
            data: expect.objectContaining({
              accountId: 'org-1',
              provider: 'square',
              currency: 'cad',
              suggestedAmounts: [20, 40, 80],
              recurringDefault: true,
              campaignId: 'spring-drive',
            }),
          },
        })
      );
    });
    expect(thunkMocks.fetchWebsiteIntegrations).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Donation provider settings saved.')).toBeInTheDocument();
  });

  it('switches to Mailchimp and preserves the legacy audience settings', async () => {
    currentState = buildState('mailchimp');
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchIntegrations', payload: 'site-1' })
      );
    });

    fireEvent.change(screen.getByLabelText('Newsletter provider'), {
      target: { value: 'mailchimp' },
    });
    fireEvent.change(screen.getByLabelText('Mailchimp audience'), {
      target: { value: 'aud-2' },
    });
    fireEvent.change(screen.getByLabelText('Mailchimp default tags'), {
      target: { value: 'members, donors' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save newsletter settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateNewsletterIntegration',
          payload: {
            siteId: 'site-1',
            data: {
              provider: 'mailchimp',
              mailchimp: {
                audienceId: 'aud-2',
                defaultTags: ['members', 'donors'],
                syncEnabled: true,
              },
            },
          },
        })
      );
    });
    expect(thunkMocks.fetchWebsiteIntegrations).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Mailchimp settings saved.')).toBeInTheDocument();
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
