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
<<<<<<< HEAD
    updateWebsiteNewsletterIntegration: createAction('websites/updateNewsletterIntegration'),
=======
    updateWebsiteMailchimpIntegration: createAction('websites/updateMailchimpIntegration'),
>>>>>>> origin/main
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

<<<<<<< HEAD
const buildState = (provider: 'mautic' | 'mailchimp') => ({
=======
const mockState = {
>>>>>>> origin/main
  websites: {
    integrations: {
      blocked: false,
      publishStatus: 'published',
<<<<<<< HEAD
      newsletter: {
        provider,
        configured: true,
        lastSyncAt: null,
      },
=======
>>>>>>> origin/main
      mailchimp: {
        audienceId: 'aud-1',
        audienceMode: 'both',
        defaultTags: ['members'],
        syncEnabled: true,
<<<<<<< HEAD
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
=======
        configured: true,
        availableAudiences: [
          { id: 'aud-1', name: 'Main Audience' },
          { id: 'aud-2', name: 'Volunteers' },
        ],
>>>>>>> origin/main
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
<<<<<<< HEAD
});

let currentState = buildState('mautic');

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof currentState) => unknown) => selector(currentState),
=======
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
>>>>>>> origin/main
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
<<<<<<< HEAD
    updateWebsiteNewsletterIntegration: thunkMocks.updateWebsiteNewsletterIntegration,
=======
    updateWebsiteMailchimpIntegration: thunkMocks.updateWebsiteMailchimpIntegration,
>>>>>>> origin/main
    updateWebsiteStripeIntegration: thunkMocks.updateWebsiteStripeIntegration,
  };
});

describe('WebsiteIntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
<<<<<<< HEAD
    currentState = buildState('mautic');
=======
>>>>>>> origin/main
    dispatchMock.mockImplementation(
      (action: { type?: string }) => Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

<<<<<<< HEAD
  it('loads integration status and saves Mautic defaults by default', async () => {
=======
  it('loads integration status and saves Mailchimp and Stripe defaults', async () => {
>>>>>>> origin/main
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchIntegrations', payload: 'site-1' })
      );
    });

<<<<<<< HEAD
    expect(screen.getByRole('heading', { name: 'Newsletter provider' })).toBeInTheDocument();
    expect(screen.getByLabelText('Newsletter provider')).toHaveValue('mautic');

    fireEvent.change(screen.getByLabelText('Mautic segment ID'), {
      target: { value: 'seg-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save newsletter settings' }));
=======
    expect(screen.getByText('Integration state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mailchimp' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stripe' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Default tags (comma separated)'), {
      target: { value: 'members, donors' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Mailchimp settings' }));
>>>>>>> origin/main

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
<<<<<<< HEAD
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
=======
          type: 'websites/updateMailchimpIntegration',
          payload: {
            siteId: 'site-1',
            data: expect.objectContaining({
              audienceId: 'aud-1',
              audienceMode: 'both',
              defaultTags: ['members', 'donors'],
              syncEnabled: true,
            }),
>>>>>>> origin/main
          },
        })
      );
    });
<<<<<<< HEAD
    expect(screen.getByText('Mautic settings saved.')).toBeInTheDocument();

=======
    expect(screen.getByText('Mailchimp settings saved.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Currency'), {
      target: { value: 'usd' },
    });
>>>>>>> origin/main
    fireEvent.click(screen.getByRole('button', { name: 'Save Stripe settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateStripeIntegration',
          payload: {
            siteId: 'site-1',
            data: expect.objectContaining({
              accountId: 'org-1',
<<<<<<< HEAD
              currency: 'cad',
=======
              currency: 'usd',
>>>>>>> origin/main
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
<<<<<<< HEAD

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
    expect(screen.getByText('Mailchimp settings saved.')).toBeInTheDocument();
  });
=======
>>>>>>> origin/main
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
