import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EventCalendarPage from '../EventCalendarPage';
import { renderWithProviders } from '../../../../test/testUtils';

const {
  listEventOccurrencesMock,
  listAppointmentsAllMock,
  listAppointmentSlotsAllMock,
  canAccessAdminSettingsMock,
} = vi.hoisted(() => ({
  listEventOccurrencesMock: vi.fn(),
  listAppointmentsAllMock: vi.fn(),
  listAppointmentSlotsAllMock: vi.fn(),
  canAccessAdminSettingsMock: vi.fn(() => false),
}));

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    listEventOccurrences: (...args: unknown[]) => listEventOccurrencesMock(...args),
  },
}));

vi.mock('../../../adminOps/api/portalAdminAppointmentsApiClient', () => ({
  portalAdminAppointmentsApiClient: {
    listAppointmentsAll: (...args: unknown[]) => listAppointmentsAllMock(...args),
    listAppointmentSlotsAll: (...args: unknown[]) => listAppointmentSlotsAllMock(...args),
    updateAppointmentStatus: vi.fn(),
    checkInAppointment: vi.fn(),
    updateSlotStatus: vi.fn(),
  },
}));

vi.mock('../../../auth/state/adminAccess', () => ({
  canAccessAdminSettings: (...args: unknown[]) => canAccessAdminSettingsMock(...args),
}));

describe('EventCalendarPage', () => {
  beforeEach(() => {
    listEventOccurrencesMock.mockReset();
    listAppointmentsAllMock.mockReset();
    listAppointmentSlotsAllMock.mockReset();
    canAccessAdminSettingsMock.mockReset();
    canAccessAdminSettingsMock.mockReturnValue(false);
    listEventOccurrencesMock.mockResolvedValue([]);
    listAppointmentsAllMock.mockResolvedValue([]);
    listAppointmentSlotsAllMock.mockResolvedValue([]);
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
