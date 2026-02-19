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
    getMock.mockResolvedValueOnce({ data: [{ type: 'event', id: '1', title: 'Town Hall', date: new Date().toISOString() }] });
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Town Hall')).toBeInTheDocument();
    });
  });

  it('shows retry when API fails', async () => {
    const user = userEvent.setup();
    getMock.mockRejectedValueOnce(new Error('fail'));
    getMock.mockResolvedValueOnce({ data: [] });
    renderWithProviders(<PortalDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/unable to load reminders/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(getMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
