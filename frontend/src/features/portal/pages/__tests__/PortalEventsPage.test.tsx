import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalEventsPage from '../PortalEventsPage';

const registerEventMock = vi.fn();
const cancelEventRegistrationMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('../../api/portalApiClient', () => ({
  portalV2ApiClient: {
    registerEvent: (...args: unknown[]) => registerEventMock(...args),
    cancelEventRegistration: (...args: unknown[]) => cancelEventRegistrationMock(...args),
  },
}));

vi.mock('../../client/usePortalEventsList', () => ({
  default: () => ({
    items: [
      {
        id: 'event-1',
        name: 'Community Workshop',
        description: 'Bring your pass',
        event_type: 'community',
        series_id: 'series-1',
        occurrence_id: 'occurrence-2',
        occurrence_name: 'Week 2',
        occurrence_index: 2,
        occurrence_count: 6,
        occurrence_start_date: '2026-06-10T18:00:00.000Z',
        occurrence_end_date: '2026-06-10T20:00:00.000Z',
        start_date: '2026-06-10T18:00:00.000Z',
        end_date: '2026-06-10T20:00:00.000Z',
        location_name: 'Main Hall',
        registration_id: 'reg-1',
        registration_status: 'confirmed',
        confirmation_email_status: 'sent',
        confirmation_email_sent_at: '2026-06-09T16:00:00.000Z',
        check_in_token: 'qr-pass-token',
        checked_in: false,
        check_in_time: null,
      },
      {
        id: 'event-2',
        name: 'Open House',
        description: 'Public signup',
        event_type: 'community',
        start_date: '2026-06-11T18:00:00.000Z',
        end_date: '2026-06-11T20:00:00.000Z',
        location_name: 'Lobby',
        registration_id: null,
        registration_status: null,
        check_in_token: null,
        checked_in: null,
        check_in_time: null,
      },
      {
        id: 'event-3',
        name: 'Attended Session',
        description: 'Already attended',
        event_type: 'community',
        start_date: '2026-06-12T18:00:00.000Z',
        end_date: '2026-06-12T20:00:00.000Z',
        location_name: 'Auditorium',
        registration_id: 'reg-3',
        registration_status: 'registered',
        check_in_token: 'qr-pass-attended-token',
        checked_in: true,
        check_in_time: '2026-06-12T18:10:00.000Z',
      },
      {
        id: 'event-4',
        name: 'Waitlisted Session',
        description: 'Capacity reached',
        event_type: 'community',
        occurrence_id: 'occurrence-4',
        occurrence_name: 'Week 4',
        occurrence_index: 4,
        occurrence_count: 6,
        start_date: '2026-06-13T18:00:00.000Z',
        end_date: '2026-06-13T20:00:00.000Z',
        location_name: 'Training Room',
        registration_id: 'reg-4',
        registration_status: 'waitlisted',
        check_in_token: 'qr-pass-waitlisted-token',
        checked_in: false,
        check_in_time: null,
      },
    ],
    total: 4,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    refresh: refreshMock,
    loadMore: vi.fn(),
  }),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,portal-qr'),
}));

describe('PortalEventsPage', () => {
  beforeEach(() => {
    registerEventMock.mockResolvedValue(undefined);
    cancelEventRegistrationMock.mockResolvedValue(undefined);
    refreshMock.mockResolvedValue(undefined);
  });

  it('shows attendee QR pass modal for registered events', async () => {
    renderWithProviders(<PortalEventsPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Check-in pass' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /event check-in pass/i })).toBeInTheDocument();
      expect(screen.getAllByText('Week 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Confirmation sent').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Download pass' })).toBeInTheDocument();
    });
  });

  it('restores focus after dismissing the QR pass dialog with escape', async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalEventsPage />);

    const qrButton = screen.getAllByRole('button', { name: 'Check-in pass' })[0];
    qrButton.focus();
    await user.click(qrButton);

    const dialog = await screen.findByRole('dialog', { name: /event check-in pass/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /event check-in pass/i })
      ).not.toBeInTheDocument();
    });
    expect(qrButton).toHaveFocus();
  });

  it('registers for unregistered event and refreshes list', async () => {
    renderWithProviders(<PortalEventsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(registerEventMock).toHaveBeenCalledWith('event-2');
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('shows checked-in status and allows QR pass PNG download', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const anchor = {
      click: vi.fn(),
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string): HTMLElement => {
        if (tagName.toLowerCase() === 'a') {
          return anchor as unknown as HTMLElement;
        }
        return originalCreateElement(tagName);
      });

    renderWithProviders(<PortalEventsPage />);
    expect(screen.getAllByText('Checked In').length).toBeGreaterThan(0);
    expect(screen.getByText(/Checked in at/i)).toBeInTheDocument();

    const attendedCard = screen.getByText('Attended Session').closest('li');
    expect(attendedCard).not.toBeNull();
    fireEvent.click(
      within(attendedCard as HTMLElement).getByRole('button', { name: 'Check-in pass' })
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download pass' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download pass' }));
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('event-pass-event-3.png');
    expect(anchor.href).toContain('data:image/png;base64,portal-qr');

    createElementSpy.mockRestore();
  });

  it('hides QR passes for waitlisted registrations', () => {
    renderWithProviders(<PortalEventsPage />);

    const waitlistedCard = screen.getByText('Waitlisted Session').closest('li');
    expect(waitlistedCard).not.toBeNull();
    expect(
      within(waitlistedCard as HTMLElement).queryByRole('button', { name: 'Check-in pass' })
    ).toBeNull();
    expect(within(waitlistedCard as HTMLElement).getByText('Waitlisted')).toBeInTheDocument();
    expect(
      within(waitlistedCard as HTMLElement).getByRole('button', { name: 'Cancel waitlist' })
    ).toBeInTheDocument();
  });
});
