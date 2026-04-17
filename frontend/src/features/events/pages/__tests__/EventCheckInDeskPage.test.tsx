import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import EventCheckInDeskPage from '../EventCheckInDeskPage';

const listEventsAccumulatedMock = vi.fn();
const scanCheckInGlobalMock = vi.fn();
const walkInCheckInMock = vi.fn();

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    listEventsAccumulated: (...args: unknown[]) => listEventsAccumulatedMock(...args),
    scanCheckInGlobal: (...args: unknown[]) => scanCheckInGlobalMock(...args),
    walkInCheckIn: (...args: unknown[]) => walkInCheckInMock(...args),
  },
}));

vi.mock('../../components/EventQrScanner', () => ({
  default: () => <div data-testid="event-qr-scanner" />,
}));

describe('EventCheckInDeskPage', () => {
  beforeEach(() => {
    listEventsAccumulatedMock.mockResolvedValue({
      data: [
        {
          event_id: 'event-1',
          event_name: 'Desk Event',
          start_date: '2026-06-10T18:00:00.000Z',
          end_date: '2026-06-10T20:00:00.000Z',
        },
        {
          event_id: 'event-2',
          event_name: 'Second Desk Event',
          start_date: '2026-06-12T18:00:00.000Z',
          end_date: '2026-06-12T20:00:00.000Z',
        },
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 100,
        total_pages: 1,
      },
    });
  });

  it('submits global scan token', async () => {
    scanCheckInGlobalMock.mockResolvedValue({
      registration_id: 'reg-1',
      contact_name: 'Casey',
      event_name: 'Desk Event',
    });

    renderWithProviders(<EventCheckInDeskPage />);
    await screen.findByText('Walk-In Quick Add');

    fireEvent.change(screen.getByPlaceholderText('Scan token'), {
      target: { value: 'token-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));

    await waitFor(() => {
      expect(scanCheckInGlobalMock).toHaveBeenCalledWith('token-123');
      expect(screen.getByText(/Checked in Casey/)).toBeInTheDocument();
    });
  });

  it('submits walk-in attendee', async () => {
    walkInCheckInMock.mockResolvedValue({
      status: 'created_and_checked_in',
      contact_id: 'contact-1',
      registration: { registration_id: 'reg-1' },
      created_contact: true,
      created_registration: true,
    });

    renderWithProviders(<EventCheckInDeskPage />);
    await screen.findByText('Walk-In Quick Add');
    await waitFor(() => {
      expect((screen.getByLabelText('Event') as HTMLSelectElement).value).toBe('event-1');
    });

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Jamie' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Visitor' },
    });
    fireEvent.change(screen.getByLabelText('Email (or phone)'), {
      target: { value: 'jamie@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Register + Check In' }));

    await waitFor(() => {
      expect(walkInCheckInMock).toHaveBeenCalledWith('event-1', {
        first_name: 'Jamie',
        last_name: 'Visitor',
        email: 'jamie@example.com',
        phone: undefined,
        notes: undefined,
      });
      expect(screen.getByText('Walk-in registered and checked in.')).toBeInTheDocument();
    });
  });

  it('uses the eventId query param to pick the default event', async () => {
    walkInCheckInMock.mockResolvedValue({
      status: 'created_and_checked_in',
      contact_id: 'contact-2',
      registration: { registration_id: 'reg-2' },
      created_contact: true,
      created_registration: true,
    });

    renderWithProviders(<EventCheckInDeskPage />, {
      route: '/events/check-in?eventId=event-2',
    });
    await screen.findByText('Walk-In Quick Add');
    await waitFor(() => {
      expect((screen.getByLabelText('Event') as HTMLSelectElement).value).toBe('event-2');
    });

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Taylor' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Visitor' },
    });
    fireEvent.change(screen.getByLabelText('Email (or phone)'), {
      target: { value: 'taylor@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Register + Check In' }));

    await waitFor(() => {
      expect(walkInCheckInMock).toHaveBeenCalledWith('event-2', {
        first_name: 'Taylor',
        last_name: 'Visitor',
        email: 'taylor@example.com',
        phone: undefined,
        notes: undefined,
      });
    });
  });
});
