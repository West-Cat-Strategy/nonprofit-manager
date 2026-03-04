import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type * as ReactRouterDomModule from 'react-router-dom';
import { renderWithProviders } from '../../../../test/testUtils';
import PublicEventCheckInPage from '../PublicEventCheckInPage';

const getPublicCheckInInfoMock = vi.fn();
const submitPublicCheckInMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return {
    ...actual,
    useParams: () => ({ id: 'event-123' }),
  };
});

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    getPublicCheckInInfo: (...args: unknown[]) => getPublicCheckInInfoMock(...args),
    submitPublicCheckIn: (...args: unknown[]) => submitPublicCheckInMock(...args),
  },
}));

describe('PublicEventCheckInPage', () => {
  beforeEach(() => {
    getPublicCheckInInfoMock.mockResolvedValue({
      event_id: 'event-123',
      event_name: 'Community Dinner',
      description: 'Test event',
      event_type: 'community',
      status: 'planned',
      start_date: '2026-06-10T18:00:00.000Z',
      end_date: '2026-06-10T20:00:00.000Z',
      location_name: 'Main Hall',
      public_checkin_enabled: true,
      public_checkin_pin_required: true,
      checkin_open: true,
      checkin_window_before_minutes: 180,
      checkin_window_after_minutes: 240,
    });
  });

  it('submits public check-in and shows success state', async () => {
    submitPublicCheckInMock.mockResolvedValue({
      status: 'checked_in',
      contact_id: 'contact-1',
      registration: { registration_id: 'reg-1' },
      created_contact: true,
      created_registration: true,
    });

    renderWithProviders(<PublicEventCheckInPage />);

    await screen.findByText('Community Dinner');

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Avery' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Client' },
    });
    fireEvent.change(screen.getByLabelText('Email (or phone)'), {
      target: { value: 'avery@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Staff PIN'), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));

    await waitFor(() => {
      expect(submitPublicCheckInMock).toHaveBeenCalledWith('event-123', {
        first_name: 'Avery',
        last_name: 'Client',
        email: 'avery@example.com',
        phone: undefined,
        pin: '123456',
      });
      expect(screen.getByText('Check-in complete. Welcome!')).toBeInTheDocument();
    });
  });

  it('shows invalid PIN message when API returns INVALID_PIN', async () => {
    submitPublicCheckInMock.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'INVALID_PIN',
            message: 'Invalid event check-in PIN',
          },
        },
      },
    });

    renderWithProviders(<PublicEventCheckInPage />);
    await screen.findByText('Community Dinner');

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Avery' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Client' },
    });
    fireEvent.change(screen.getByLabelText('Email (or phone)'), {
      target: { value: 'avery@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Staff PIN'), {
      target: { value: '000000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));

    await waitFor(() => {
      expect(
        screen.getByText('PIN is invalid. Ask event staff for the current check-in PIN.')
      ).toBeInTheDocument();
    });
  });

  it('shows closed-window messaging when kiosk check-in is not open', async () => {
    getPublicCheckInInfoMock.mockResolvedValueOnce({
      event_id: 'event-123',
      event_name: 'Community Dinner',
      description: 'Test event',
      event_type: 'community',
      status: 'planned',
      start_date: '2026-06-10T18:00:00.000Z',
      end_date: '2026-06-10T20:00:00.000Z',
      location_name: 'Main Hall',
      public_checkin_enabled: true,
      public_checkin_pin_required: true,
      checkin_open: false,
      checkin_window_before_minutes: 180,
      checkin_window_after_minutes: 240,
    });

    renderWithProviders(<PublicEventCheckInPage />);

    await screen.findByText('Community Dinner');
    expect(screen.getByText('Check-in is currently closed for this event.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check In' })).toBeDisabled();
  });

  it('shows API error when submit returns CHECKIN_CLOSED', async () => {
    submitPublicCheckInMock.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'CHECKIN_CLOSED',
            message:
              'Check-in is available 180 minutes before start until 240 minutes after end.',
          },
        },
      },
    });

    renderWithProviders(<PublicEventCheckInPage />);
    await screen.findByText('Community Dinner');

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Avery' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Client' },
    });
    fireEvent.change(screen.getByLabelText('Email (or phone)'), {
      target: { value: 'avery@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Staff PIN'), {
      target: { value: '123456' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));

    await waitFor(() => {
      expect(
        screen.getByText('Check-in is available 180 minutes before start until 240 minutes after end.')
      ).toBeInTheDocument();
    });
  });

  it('shows unavailable-event error when event info request fails', async () => {
    getPublicCheckInInfoMock.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'Event check-in is unavailable.',
          },
        },
      },
    });

    renderWithProviders(<PublicEventCheckInPage />);

    await waitFor(() => {
      expect(screen.getByText('Event check-in is unavailable.')).toBeInTheDocument();
    });
    expect(screen.getByText('Event details unavailable.')).toBeInTheDocument();
  });
});
