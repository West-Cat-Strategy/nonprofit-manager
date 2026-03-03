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

vi.mock('../EventQrScanner', () => ({
  default: ({
    onTokenScanned,
  }: {
    enabled: boolean;
    disabled?: boolean;
    onTokenScanned: (token: string) => void;
  }) => (
    <button type="button" onClick={() => onTokenScanned('camera-scan-token')}>
      Simulate Camera Scan
    </button>
  ),
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

  const props: ComponentProps<typeof EventRegistrationsPanel> = {
    eventStartDate: '2026-03-10T18:00:00.000Z',
    organizationTimezone: 'America/Vancouver',
    registrations: [baseRegistration],
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
    onScanCheckIn,
    onCancelAutomation: vi.fn().mockResolvedValue(undefined),
    onCreateAutomation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  renderWithProviders(<EventRegistrationsPanel {...props} />);
  return { onScanCheckIn };
};

describe('EventRegistrationsPanel', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Camera Scan' }));

    await waitFor(() => {
      expect(onScanCheckIn).toHaveBeenCalledWith('camera-scan-token');
    });
  });
});
