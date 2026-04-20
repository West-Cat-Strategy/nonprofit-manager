import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useLocation } from 'react-router-dom';
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-location">{`${location.pathname}${location.search}`}</div>;
}

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

  it('keeps the legacy alias location stable when the month is set without a date', async () => {
    listEventOccurrencesMock.mockResolvedValueOnce([
      {
        occurrence_id: 'occ-1',
        event_id: 'event-1',
        event_name: 'Spring Gala',
        occurrence_name: 'Opening Night',
        event_type: 'fundraiser',
        status: 'planned',
        is_public: true,
        description: 'Annual fundraiser',
        start_date: '2026-05-12T18:00:00.000Z',
        end_date: '2026-05-12T20:00:00.000Z',
        location_name: 'Main Hall',
        capacity: 120,
        registered_count: 42,
        attended_count: 0,
        waitlist_enabled: true,
        public_checkin_enabled: true,
        public_checkin_pin_configured: true,
      },
    ]);

    renderWithProviders(
      <>
        <EventCalendarPage />
        <LocationProbe />
      </>,
      {
        route: '/events/calendar?month=2026-05',
      }
    );

    await screen.findByTestId('mobile-event-card');
    expect(screen.getByTestId('current-location')).toHaveTextContent('/events/calendar?month=2026-05');
  });
});
