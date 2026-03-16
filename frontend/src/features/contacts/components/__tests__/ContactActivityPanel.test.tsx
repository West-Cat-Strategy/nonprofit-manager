import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ContactActivityPanel from '../ContactActivityPanel';
import { renderWithProviders } from '../../../../test/testUtils';

const getMock = vi.fn();

vi.mock('../../../../services/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe('ContactActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a stable empty state when there is no contact activity', async () => {
    getMock.mockResolvedValue({
      data: {
        activities: [],
        total: 0,
      },
    });

    renderWithProviders(<ContactActivityPanel contactId="contact-1" />);

    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('shows an error state with retry support', async () => {
    getMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        data: {
          activities: [
            {
              id: 'activity-1',
              type: 'case_created',
              title: 'Case created',
              description: 'Case CB-1001: Housing support',
              timestamp: '2026-03-15T10:00:00.000Z',
              user_name: 'Case Worker',
              entity_type: 'case',
              entity_id: 'case-1',
              metadata: {},
            },
          ],
          total: 1,
        },
      });

    renderWithProviders(<ContactActivityPanel contactId="contact-1" />);

    expect(await screen.findByText(/failed to load the activity timeline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /open related record/i })).toHaveAttribute(
        'href',
        '/cases/case-1'
      );
    });
  });
});
