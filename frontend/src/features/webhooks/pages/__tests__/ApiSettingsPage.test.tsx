import type { ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ApiSettingsPage from '../ApiSettingsPage';
import { renderWithProviders } from '../../../../test/testUtils';
import api from '../../../../services/api';

vi.mock('../../components/ApiSettingsWorkspace', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => (
    <div>
      <h1>API &amp; Webhooks</h1>
      <p>
        Manage webhook endpoints, delivery history, and API key access from one admin workspace.
      </p>
      {children}
    </div>
  ),
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const endpoint = {
  id: 'endpoint-1',
  url: 'https://example.org/webhooks',
  description: 'Primary webhook endpoint',
  secret: 'whsec_test_123',
  events: ['contact.created'],
  isActive: true,
  createdAt: '2026-04-15T00:00:00.000Z',
  updatedAt: '2026-04-15T00:00:00.000Z',
  lastDeliveryAt: '2026-04-15T01:00:00.000Z',
  lastDeliveryStatus: 'success',
  totalDeliveries: 3,
  successfulDeliveries: 3,
  failedDeliveries: 0,
};

const apiKey = {
  id: 'key-1',
  name: 'Existing Integration',
  keyPrefix: 'nm_live',
  scopes: ['read:contacts'],
  status: 'active',
  createdAt: '2026-04-15T00:00:00.000Z',
  updatedAt: '2026-04-15T00:00:00.000Z',
};

const scopes = [
  {
    scope: 'read:contacts',
    name: 'Read Contacts',
    description: 'Read contact records',
  },
];

const events = [
  {
    type: 'contact.created',
    name: 'Contact Created',
    description: 'A contact is created',
    category: 'contacts',
  },
];

describe('ApiSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/webhooks/endpoints') {
        return Promise.resolve({ data: [endpoint] });
      }

      if (url === '/webhooks/events') {
        return Promise.resolve({ data: events });
      }

      if (url === '/webhooks/api-keys') {
        return Promise.resolve({ data: [apiKey] });
      }

      if (url === '/webhooks/api-keys/scopes') {
        return Promise.resolve({ data: scopes });
      }

      return Promise.resolve({ data: [] });
    });

    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/webhooks/api-keys') {
        return Promise.resolve({
          data: {
            id: 'key-2',
            name: 'Production Integration',
            keyPrefix: 'nm_live_2',
            scopes: ['read:contacts'],
            status: 'active',
            createdAt: '2026-04-16T00:00:00.000Z',
            updatedAt: '2026-04-16T00:00:00.000Z',
            key: 'sk_test_created',
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('loads the api settings screen and switches between tabs', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ApiSettingsPage />, { route: '/settings/api' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /webhooks \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /api keys \(1\)/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add webhook/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /api keys \(1\)/i }));
    expect(await screen.findByRole('button', { name: /create api key/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /webhooks \(1\)/i }));
    expect(await screen.findByRole('button', { name: /add webhook/i })).toBeInTheDocument();
  }, 10000);

  it('creates an api key from the api keys tab', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ApiSettingsPage />, { route: '/settings/api' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /api keys \(1\)/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /api keys \(1\)/i }));
    await user.click(screen.getByRole('button', { name: /create api key/i }));

    await user.type(
      screen.getByPlaceholderText(/production integration/i),
      'Production Integration'
    );
    await user.click(screen.getByRole('checkbox', { name: /read contacts/i }));
    await user.click(screen.getAllByRole('button', { name: /^create api key$/i })[1]);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/webhooks/api-keys', {
        name: 'Production Integration',
        scopes: ['read:contacts'],
      });
    });

    expect(await screen.findByRole('heading', { name: /api key created/i })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /api key created/i })).toBeInTheDocument();
  });

  it('opens delivery history in an accessible dialog', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ApiSettingsPage />, { route: '/settings/api' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /webhooks \(1\)/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /view deliveries/i }));

    expect(await screen.findByRole('dialog', { name: /delivery history/i })).toBeInTheDocument();
    expect(screen.getByText(/no deliveries yet/i)).toBeInTheDocument();
  });
});
