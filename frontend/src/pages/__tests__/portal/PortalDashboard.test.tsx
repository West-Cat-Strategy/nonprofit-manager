import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PortalDashboard from '../../PortalDashboard';
import { renderWithProviders } from '../../../test/testUtils';

const getMock = vi.fn();

vi.mock('../../../services/portalApi', () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}));

vi.mock('../../../components/portal/PortalPageState', () => ({
  default: ({ loading, error, onRetry }: { loading?: boolean; error?: string; onRetry: () => void }) => (
    <div>
      <span>{loading ? 'Loading reminders...' : error || 'ready'}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('PortalDashboard page', () => {
  it('renders reminders from API', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [{ type: 'event', id: '1', title: 'Town Hall', date: new Date().toISOString() }],
          page: { limit: 20, offset: 0, has_more: false, total: 1 },
        },
      },
    });
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Town Hall')).toBeInTheDocument();
    });
  });

  it('shows retry when API fails', async () => {
    const user = userEvent.setup();
    getMock.mockRejectedValueOnce(new Error('fail'));
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [],
          page: { limit: 20, offset: 0, has_more: false, total: 0 },
        },
      },
    });
    renderWithProviders(<PortalDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/unable to load reminders/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(getMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
