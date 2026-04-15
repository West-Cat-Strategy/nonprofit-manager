import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EventCalendarPage from '../EventCalendarPage';
import { renderWithProviders } from '../../../../test/testUtils';

const listEventsAccumulatedMock = vi.fn();

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    listEventsAccumulated: (...args: unknown[]) => listEventsAccumulatedMock(...args),
  },
}));

vi.mock('../../../adminOps/api/portalAdminAppointmentsApiClient', () => ({
  portalAdminAppointmentsApiClient: {
    listAppointmentsAll: vi.fn(),
    listAppointmentSlotsAll: vi.fn(),
  },
}));

vi.mock('../../../auth/state/adminAccess', () => ({
  canAccessAdminSettings: () => false,
}));

describe('EventCalendarPage', () => {
  beforeEach(() => {
    listEventsAccumulatedMock.mockResolvedValue({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 100,
        total_pages: 1,
      },
    });
  });

  it('renders the event-first planner and loads event occurrences for the visible month', async () => {
    renderWithProviders(<EventCalendarPage />);

    expect(screen.getByRole('heading', { name: /Events Calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Event/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(listEventsAccumulatedMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'start_date',
          sortOrder: 'asc',
          page: 1,
          limit: 100,
        })
      );
    });
  });
});
