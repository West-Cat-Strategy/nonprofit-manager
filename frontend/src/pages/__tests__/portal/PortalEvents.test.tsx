import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PortalEvents from '../../PortalEvents';
import { renderWithProviders } from '../../../test/testUtils';

const getMock = vi.fn();
const postMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

describe('PortalEvents page', () => {
  beforeEach(() => {
    getMock.mockResolvedValue({
      data: [
        {
          id: 'event-public',
          name: 'Public Workshop',
          description: 'Open to all clients',
          start_date: new Date(Date.now() + 7200_000).toISOString(),
          end_date: new Date(Date.now() + 9000_000).toISOString(),
          registration_id: null,
        },
        {
          id: 'event-private-registered',
          name: 'Private Case Seminar',
          description: 'Registered private event',
          start_date: new Date(Date.now() + 10_800_000).toISOString(),
          end_date: new Date(Date.now() + 12_600_000).toISOString(),
          registration_id: 'reg-1',
          registration_status: 'registered',
        },
      ],
    });
  });

  it('renders upcoming public and registered private events', async () => {
    renderWithProviders(<PortalEvents />);

    await waitFor(() => {
      expect(screen.getByText(/public workshop/i)).toBeInTheDocument();
      expect(screen.getByText(/private case seminar/i)).toBeInTheDocument();
    });
  });
});
