import { fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import type { ComponentProps } from 'react';
import { renderWithProviders } from '../../../../test/testUtils';
import type { EventRegistration } from '../../../../types/event';
import EventRegistrationsPanel from '../EventRegistrationsPanel';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
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
  created_at: '2026-03-02T18:00:00.000Z',
  updated_at: '2026-03-02T18:00:00.000Z',
  contact_name: 'Casey Contact',
  contact_email: 'casey@example.com',
};

const setup = (overrides?: Partial<ComponentProps<typeof EventRegistrationsPanel>>) => {
  const onScanCheckIn = vi.fn().mockResolvedValue(undefined);
  const onUpdateCheckInSettings = vi.fn().mockResolvedValue(undefined);
  const onRotateCheckInPin = vi.fn().mockResolvedValue('123456');

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
    onCancelRegistration: vi.fn().mockResolvedValue(undefined),
    onSendReminders: vi.fn().mockResolvedValue(undefined),
    onUpdateCheckInSettings,
    onRotateCheckInPin,
    onScanCheckIn,
    onCancelAutomation: vi.fn().mockResolvedValue(undefined),
    onCreateAutomation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  renderWithProviders(<EventRegistrationsPanel {...props} />);
  return { onScanCheckIn, onUpdateCheckInSettings, onRotateCheckInPin };
};

describe('EventRegistrationsPanel', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
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
});
