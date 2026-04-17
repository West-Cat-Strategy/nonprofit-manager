import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EventList from '../EventsHubPage';
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

describe('EventList page', () => {
  beforeEach(() => {
    listEventOccurrencesMock.mockReset();
    listAppointmentsAllMock.mockReset();
    listAppointmentSlotsAllMock.mockReset();
    canAccessAdminSettingsMock.mockReset();
    canAccessAdminSettingsMock.mockReturnValue(false);
    listAppointmentsAllMock.mockResolvedValue([]);
    listAppointmentSlotsAllMock.mockResolvedValue([]);
    listEventOccurrencesMock.mockResolvedValue([
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
  });

  it('restores workspace filters from the URL and loads month occurrences', async () => {
    renderWithProviders(<EventList />, {
      route: '/events?month=2026-05&date=2026-05-12&search=clinic&type=community&status=planned',
    });

    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create event' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('clinic');
    expect(screen.getByLabelText('Type')).toHaveValue('community');
    expect(screen.getByLabelText('Status')).toHaveValue('planned');

    await waitFor(() => {
      expect(listEventOccurrencesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'clinic',
          eventType: 'community',
          status: 'planned',
          startDate: expect.stringMatching(/^2026-04-26/),
          endDate: expect.stringMatching(/^2026-06-07/),
        })
      );
    });
  });

  it('reloads the workspace when the visible month changes', async () => {
    renderWithProviders(<EventList />, {
      route: '/events?month=2026-05&date=2026-05-12',
    });

    await waitFor(() => {
      expect(listEventOccurrencesMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    await waitFor(() => {
      expect(listEventOccurrencesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.stringMatching(/^2026-05-31/),
          endDate: expect.stringMatching(/^2026-07-05/),
        })
      );
    });
  });

  it('shows occurrence quick actions for the selected calendar item', async () => {
    renderWithProviders(<EventList />, {
      route: '/events?month=2026-05&date=2026-05-12',
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'View details' })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Edit event' })).toHaveAttribute(
      'href',
      '/events/event-1/edit'
    );
    expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute(
      'href',
      '/events/check-in?eventId=event-1'
    );
    expect(screen.getByRole('link', { name: 'Open registrations' })).toHaveAttribute(
      'href',
      '/events/event-1?tab=registrations&occurrence=occ-1'
    );
  });

  it('loads event occurrences, appointments, and slots for admin scope=all within the visible range', async () => {
    canAccessAdminSettingsMock.mockReturnValue(true);
    listAppointmentsAllMock.mockResolvedValue([
      {
        id: 'appt-1',
        contact_id: 'contact-1',
        case_id: null,
        pointperson_user_id: null,
        slot_id: null,
        request_type: 'manual_request',
        title: 'Intake review',
        description: 'Confirmed appointment',
        start_time: '2026-05-12T15:00:00.000Z',
        end_time: '2026-05-12T15:30:00.000Z',
        status: 'confirmed',
        location: 'Room 2',
        created_at: '2026-05-01T10:00:00.000Z',
        updated_at: '2026-05-01T10:00:00.000Z',
      },
    ]);
    listAppointmentSlotsAllMock.mockResolvedValue([
      {
        id: 'slot-1',
        pointperson_user_id: 'user-1',
        case_id: null,
        title: 'Open consult',
        details: 'Open drop-in slot',
        location: 'Room 3',
        start_time: '2026-05-12T16:00:00.000Z',
        end_time: '2026-05-12T16:30:00.000Z',
        capacity: 1,
        booked_count: 0,
        available_count: 1,
        status: 'open',
      },
    ]);

    renderWithProviders(<EventList />, {
      route: '/events?month=2026-05&date=2026-05-12&scope=all',
    });

    await waitFor(() => {
      expect(listEventOccurrencesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.stringMatching(/^2026-04-26/),
          endDate: expect.stringMatching(/^2026-06-07/),
        })
      );
      expect(listAppointmentsAllMock).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.stringMatching(/^2026-04-26/),
          date_to: expect.stringMatching(/^2026-06-07/),
        })
      );
      expect(listAppointmentSlotsAllMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringMatching(/^2026-04-26/),
          to: expect.stringMatching(/^2026-06-07/),
        })
      );
    });

    expect(screen.getByText('Spring Gala')).toBeInTheDocument();
    expect(screen.getByText('Intake review')).toBeInTheDocument();
    expect(screen.getByText('Open consult')).toBeInTheDocument();
  });
});
