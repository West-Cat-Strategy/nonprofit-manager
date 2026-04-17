import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EventList from '../EventsHubPage';
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

describe('EventList page', () => {
  beforeEach(() => {
    listEventOccurrencesMock.mockReset();
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
});
