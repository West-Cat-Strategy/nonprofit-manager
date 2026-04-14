import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailMarketingPage from '../EmailMarketingPage';
import { renderWithProviders } from '../../../../test/testUtils';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../components/AdminPanelLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

vi.mock('../../components/AdminPanelNav', () => ({
  default: () => <div data-testid="admin-panel-nav" />,
}));

vi.mock('../adminSettings/sections/EmailSettingsSection', () => ({
  default: () => <div data-testid="email-settings-section" />,
}));

const mockedApi = vi.mocked(api);

describe('EmailMarketingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/mailchimp/status') {
        return Promise.resolve({ data: { configured: true } });
      }

      if (url === '/mailchimp/lists') {
        return Promise.resolve({
          data: [
            {
              id: 'list-1',
              name: 'Main Audience',
              memberCount: 42,
              doubleOptIn: false,
            },
          ],
        });
      }

      if (url === '/mailchimp/campaigns') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/mailchimp/lists/list-1/segments') {
        return Promise.resolve({ data: [] });
      }

      if (url === '/v2/contacts') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              data: [],
              pagination: {
                total: 0,
                page: 1,
                limit: 100,
                total_pages: 0,
              },
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('keeps the campaign title input stable while typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    const newCampaignButton = await screen.findByRole('button', { name: /new campaign/i });
    await waitFor(() => {
      expect(newCampaignButton).not.toBeDisabled();
    });

    await user.click(newCampaignButton);

    const modalTitle = await screen.findByText('Create Email Campaign');
    const modalRoot = modalTitle.closest('div.fixed') as HTMLElement;
    expect(modalRoot).toBeTruthy();

    const titleInput = modalRoot.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(titleInput, 'Spring Appeal');

    expect(titleInput.value).toBe('Spring Appeal');
  });

  it('uses the email marketing title on the canonical settings route', async () => {
    renderWithProviders(<EmailMarketingPage />, {
      route: '/settings/email-marketing',
    });

    expect(await screen.findByRole('heading', { name: /email marketing/i })).toBeInTheDocument();
  });
});
