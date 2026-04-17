import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import { renderWithProviders } from '../../../../test/testUtils';
import type { EventRegistration } from '../../../../types/event';
import EventRegistrationsPanel from '../EventRegistrationsPanel';

const listCasesMock = vi.fn();
const toDataURLMock = vi.fn().mockResolvedValue('data:image/png;base64,mock');

vi.mock('qrcode', () => ({
  toDataURL: toDataURLMock,
  default: {
    toDataURL: toDataURLMock,
  },
}));

vi.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: class {
    decodeFromConstraints(
      _constraints: unknown,
      _video: unknown,
      callback: (result: { getText: () => string } | null) => void
    ) {
      callback({ getText: () => 'camera-scan-token' });
      return Promise.resolve({ stop: vi.fn() });
    }
  },
}));

vi.mock('../../../cases/api/casesApiClient', () => ({
  casesApiClient: {
    listCases: (...args: unknown[]) => listCasesMock(...args),
  },
}));

const baseRegistration: EventRegistration = {
  registration_id: 'registration-1',
  event_id: 'event-1',
  contact_id: 'contact-1',
  registration_status: 'registered',
  checked_in: false,
  check_in_time: null,
  checked_in_by: null,
  check_in_method: 'manual',
  check_in_token: 'manual-token-123',
  notes: null,
  case_id: null,
  created_at: '2026-03-02T18:00:00.000Z',
  updated_at: '2026-03-02T18:00:00.000Z',
  contact_name: 'Casey Contact',
  contact_email: 'casey@example.com',
};

const setup = (overrides?: Partial<ComponentProps<typeof EventRegistrationsPanel>>) => {
  const onScanCheckIn = vi.fn().mockResolvedValue(undefined);
  const onUpdateCheckInSettings = vi.fn().mockResolvedValue(undefined);
  const onRotateCheckInPin = vi.fn().mockResolvedValue('123456');
  const onUpdateRegistration = vi.fn().mockResolvedValue(undefined);
  const onSendConfirmationEmail = vi.fn().mockResolvedValue(undefined);

  const props: ComponentProps<typeof EventRegistrationsPanel> = {
    eventId: 'event-1',
    eventStartDate: '2026-03-10T18:00:00.000Z',
    organizationTimezone: 'America/Vancouver',
    registrations: [baseRegistration],
    checkInSettings: {
      event_id: 'event-1',
      public_checkin_enabled: false,
      public_checkin_pin_configured: true,
      public_checkin_pin_rotated_at: null,
    },
    checkInSettingsLoading: false,
    actionLoading: false,
    remindersSending: false,
    remindersError: null,
    reminderSummary: null,
    reminderAutomations: [],
    automationsLoading: false,
    automationsBusy: false,
    onCheckIn: vi.fn().mockResolvedValue(undefined),
    onUpdateRegistration,
    onCancelRegistration: vi.fn().mockResolvedValue(undefined),
    onSendReminders: vi.fn().mockResolvedValue(undefined),
    onUpdateCheckInSettings,
    onRotateCheckInPin,
    onScanCheckIn,
    onSendConfirmationEmail,
    onCancelAutomation: vi.fn().mockResolvedValue(undefined),
    onCreateAutomation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  renderWithProviders(<EventRegistrationsPanel {...props} />);
  return {
    onScanCheckIn,
    onUpdateCheckInSettings,
    onRotateCheckInPin,
    onUpdateRegistration,
    onSendConfirmationEmail,
  };
};

describe('EventRegistrationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    listCasesMock.mockResolvedValue({
      cases: [
        {
          id: 'case-1',
          case_number: 'CASE-001',
          title: 'Housing support',
        },
      ],
    });
  });

  it('submits manual token check-in', async () => {
    const { onScanCheckIn } = setup();

    fireEvent.change(screen.getByPlaceholderText('Scan token'), {
      target: { value: 'manual-token-abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'QR Check-In' }));

    await waitFor(() => {
      expect(onScanCheckIn).toHaveBeenCalledWith('manual-token-abc');
    });
  });

  it('renders QR codes for registrations with check-in tokens', async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByAltText('Check-in QR')).toBeInTheDocument();
    });
  });

  it('sends reminders from the reminder controls', async () => {
    const onSendReminders = vi.fn().mockResolvedValue(undefined);

    setup({
      onSendReminders,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Reminders' }));

    await waitFor(() => {
      expect(onSendReminders).toHaveBeenCalledWith({
        sendEmail: true,
        sendSms: true,
        customMessage: undefined,
      });
    });
  });

  it('handles camera scan callback', async () => {
    const { onScanCheckIn } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Open Camera' }));

    expect(screen.getByText('Initializing camera scanner...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onScanCheckIn).toHaveBeenCalledWith('camera-scan-token');
    });
  });

  it('updates kiosk settings and rotates PIN', async () => {
    const { onUpdateCheckInSettings, onRotateCheckInPin } = setup();

    fireEvent.click(screen.getByLabelText('Enable public kiosk'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onUpdateCheckInSettings).toHaveBeenCalledWith(true);
      expect(screen.getByText('Public kiosk enabled.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Rotate PIN' }));

    await waitFor(() => {
      expect(onRotateCheckInPin).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Current PIN:/i)).toBeInTheDocument();
      expect(screen.getByText('PIN rotated. Share this PIN with on-site staff only.')).toBeInTheDocument();
    });
  });

  it('keeps kiosk controls disabled while check-in settings are loading', () => {
    setup({
      checkInSettingsLoading: true,
    });

    expect(screen.getByLabelText('Enable public kiosk')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rotate PIN' })).toBeDisabled();
  });

  it('opens the manage flow, loads cases, and saves registration updates', async () => {
    const { onUpdateRegistration } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));

    await waitFor(() => {
      expect(listCasesMock).toHaveBeenCalledWith({
        contactId: 'contact-1',
        limit: 100,
      });
    });

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'confirmed' },
    });
    fireEvent.change(screen.getByLabelText('Linked Case'), {
      target: { value: 'case-1' },
    });
    fireEvent.change(screen.getByLabelText('Internal Notes'), {
      target: { value: 'Arriving with spouse' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onUpdateRegistration).toHaveBeenCalledWith('registration-1', {
        registration_status: 'confirmed',
        notes: 'Arriving with spouse',
        case_id: 'case-1',
        occurrence_id: undefined,
        scope: 'occurrence',
      });
    });

    expect(await screen.findByText('Registration updated.')).toBeInTheDocument();
  });

  it('shows that waitlisted contacts cannot be checked in', () => {
    setup({
      registrations: [
        {
          ...baseRegistration,
          registration_id: 'registration-2',
          registration_status: 'waitlisted',
        },
      ],
    });

    expect(screen.queryByRole('button', { name: 'Check In' })).not.toBeInTheDocument();
    expect(screen.getByText('Waitlisted contacts cannot check in')).toBeInTheDocument();
  });

  it('surfaces batch scope controls and confirmation email actions', async () => {
    const { onSendConfirmationEmail } = setup();

    expect(screen.getByRole('button', { name: 'This occurrence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Whole series' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send QR Email' }));

    await waitFor(() => {
      expect(onSendConfirmationEmail).toHaveBeenCalledWith('registration-1');
    });
  });
});
