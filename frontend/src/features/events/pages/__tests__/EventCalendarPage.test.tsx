import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EventCalendarPage from '../EventCalendarPage';
import { renderWithProviders } from '../../../../test/testUtils';

const listEventOccurrencesMock = vi.fn();

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    listEventOccurrences: (...args: unknown[]) => listEventOccurrencesMock(...args),
  },
}));

vi.mock('../../../adminOps/api/portalAdminAppointmentsApiClient', () => ({
  portalAdminAppointmentsApiClient: {
    listAppointmentsAll: vi.fn(),
    listAppointmentSlotsAll: vi.fn(),
    updateAppointmentStatus: vi.fn(),
    checkInAppointment: vi.fn(),
    updateSlotStatus: vi.fn(),
  },
}));

vi.mock('../../../auth/state/adminAccess', () => ({
  canAccessAdminSettings: () => false,
}));

describe('EventCalendarPage', () => {
  beforeEach(() => {
    listEventOccurrencesMock.mockReset();
    listEventOccurrencesMock.mockResolvedValue([]);
  });

  it('renders the same calendar-first workspace on the legacy /events/calendar alias', async () => {
    renderWithProviders(<EventCalendarPage />, {
      route: '/events/calendar?month=2026-05&date=2026-05-12',
    });

    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create event' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check-in desk' })).toBeInTheDocument();

    await waitFor(() => {
      expect(listEventOccurrencesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.stringMatching(/^2026-04-26/),
          endDate: expect.stringMatching(/^2026-06-07/),
        })
      );
    });
  });
});
