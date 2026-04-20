import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ContactActivityPanel from '../ContactActivityPanel';
import { renderWithProviders } from '../../../../test/testUtils';
import { useEntityActivities } from '../../../activities/hooks';

vi.mock('../../../activities/hooks', () => ({
  useEntityActivities: vi.fn(),
}));

describe('ContactActivityPanel', () => {
  const refreshMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEntityActivities).mockReturnValue({
      activities: [],
      total: 0,
      loading: false,
      error: null,
      refresh: refreshMock,
    });
  });

  it('renders a stable empty state when there is no contact activity', async () => {
    renderWithProviders(<ContactActivityPanel contactId="contact-1" />);

    expect(useEntityActivities).toHaveBeenCalledWith({
      entityType: 'contact',
      entityId: 'contact-1',
    });
    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('shows an error state with retry support', async () => {
    vi.mocked(useEntityActivities).mockReturnValue({
      activities: [],
      total: 0,
      loading: false,
      error: 'Failed to load the activity timeline.',
      refresh: refreshMock,
    });

    renderWithProviders(<ContactActivityPanel contactId="contact-1" />);

    expect(await screen.findByText(/failed to load the activity timeline/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('renders related record links for returned activity items', async () => {
    vi.mocked(useEntityActivities).mockReturnValue({
      activities: [
        {
          id: 'activity-1',
          type: 'case_created',
          title: 'Case created',
          description: 'Case CB-1001: Housing support',
          timestamp: '2026-03-15T10:00:00.000Z',
          user_id: 'user-1',
          user_name: 'Case Worker',
          entity_type: 'case',
          entity_id: 'case-1',
          metadata: {},
        },
      ],
      total: 1,
      loading: false,
      error: null,
      refresh: refreshMock,
    });

    renderWithProviders(<ContactActivityPanel contactId="contact-1" />);

    expect(await screen.findByRole('link', { name: /open related record/i })).toHaveAttribute(
      'href',
      '/cases/case-1'
    );
  });
});
