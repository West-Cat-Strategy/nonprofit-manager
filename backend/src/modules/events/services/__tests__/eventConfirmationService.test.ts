import QRCode from 'qrcode';
import { Pool } from 'pg';
import { RegistrationStatus } from '@app-types/event';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendMail } from '@services/emailService';
import { EventConfirmationService } from '../eventConfirmationService';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toBuffer: jest.fn(),
    toDataURL: jest.fn(),
  },
}));

jest.mock('@services/emailSettingsService', () => ({
  getEmailSettings: jest.fn(),
}));

jest.mock('@services/emailService', () => ({
  sendMail: jest.fn(),
}));

describe('EventConfirmationService.sendRegistrationConfirmationEmail', () => {
  const mockQuery = jest.fn();
  const pool = { query: mockQuery } as unknown as Pool;
  const service = new EventConfirmationService(pool);

  const qrCode = QRCode as unknown as {
    toBuffer: jest.Mock;
    toDataURL: jest.Mock;
  };

  const mockGetEmailSettings = getEmailSettings as jest.MockedFunction<typeof getEmailSettings>;
  const mockSendMail = sendMail as jest.MockedFunction<typeof sendMail>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a failed delivery result when sending the confirmation email rejects', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            registration_id: 'reg-1',
            event_id: 'event-1',
            occurrence_id: 'occ-1',
            registration_status: RegistrationStatus.REGISTERED,
            check_in_token: 'token-123',
            event_name: 'Community Clinic',
            description: 'Annual event',
            start_date: new Date('2026-06-15T18:00:00.000Z'),
            end_date: new Date('2026-06-15T20:00:00.000Z'),
            location_name: 'Community Center',
            address_line1: '123 Main St',
            address_line2: null,
            city: 'Vancouver',
            state_province: 'BC',
            postal_code: 'V5K 0A1',
            country: 'Canada',
            occurrence_name: 'Community Clinic',
            occurrence_index: 1,
            occurrence_count: 1,
            contact_name: 'Test User',
            contact_email: 'test@example.com',
            do_not_email: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockGetEmailSettings.mockResolvedValueOnce({ isConfigured: true } as never);
    qrCode.toBuffer.mockResolvedValueOnce(Buffer.from('qr-code'));
    qrCode.toDataURL.mockResolvedValueOnce('data:image/png;base64,qr-code');
    mockSendMail.mockRejectedValueOnce(new Error('smtp exploded'));

    const result = await service.sendRegistrationConfirmationEmail('reg-1', 'user-1');

    expect(result).toEqual(
      expect.objectContaining({
        registration_id: 'reg-1',
        event_id: 'event-1',
        occurrence_id: 'occ-1',
        status: 'failed',
        message: 'Confirmation email could not be sent.',
        qr_code_url: 'data:image/png;base64,qr-code',
      })
    );
    expect(qrCode.toBuffer).toHaveBeenCalledWith('token-123', expect.any(Object));
    expect(qrCode.toDataURL).toHaveBeenCalledWith('token-123', expect.any(Object));
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const updateCall = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(updateCall[1]).toEqual([
      'reg-1',
      'failed',
      null,
      'Confirmation email could not be sent.',
    ]);

    const deliveryCall = mockQuery.mock.calls[2] as [string, unknown[]];
    expect(deliveryCall[1][3]).toBe('failed');
    expect(deliveryCall[1][4]).toBe('Confirmation email could not be sent.');
    expect(deliveryCall[1][6]).toBe('user-1');
  });
});
