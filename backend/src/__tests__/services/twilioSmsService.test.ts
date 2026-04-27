import twilio from 'twilio';
import pool from '@config/database';
import { sendSms, testTwilioConnection } from '@services/twilioSmsService';

const messagesCreateMock = jest.fn();
const accountFetchMock = jest.fn();
const accountsMock = jest.fn(() => ({ fetch: accountFetchMock }));

const twilioClient = {
  messages: {
    create: messagesCreateMock,
  },
  api: {
    v2010: {
      accounts: accountsMock,
    },
  },
};

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@utils/encryption', () => ({
  decrypt: jest.fn(() => 'twilio-auth-token'),
}));

type TwilioSettingsRow = {
  id: string;
  account_sid: string | null;
  auth_token_encrypted: string | null;
  messaging_service_sid: string | null;
  from_phone_number: string | null;
  is_configured: boolean;
  last_tested_at: Date | null;
  last_test_success: boolean | null;
  created_at: Date;
  updated_at: Date;
};

describe('twilioSmsService', () => {
  const mockQuery = pool.query as jest.Mock;
  const mockTwilio = twilio as unknown as jest.Mock;
  const testAccountSid = ['AC', '1234567890abcdef1234567890abcdef'].join('');
  const testMessagingServiceSid = ['MG', '1234567890abcdef1234567890abcdef'].join('');

  const makeSettingsRow = (overrides: Partial<TwilioSettingsRow> = {}): TwilioSettingsRow => ({
    id: 'twilio-settings-1',
    account_sid: testAccountSid,
    auth_token_encrypted: 'enc:twilio-auth-token',
    messaging_service_sid: testMessagingServiceSid,
    from_phone_number: null,
    is_configured: true,
    last_tested_at: null,
    last_test_success: null,
    created_at: new Date('2026-03-10T12:00:00.000Z'),
    updated_at: new Date('2026-03-10T12:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockTwilio.mockClear();
    mockTwilio.mockReturnValue(twilioClient);
    messagesCreateMock.mockReset();
    accountFetchMock.mockReset();
    accountsMock.mockClear();
  });

  it('sends SMS with the Messaging Service SID when configured', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeSettingsRow()] });
    messagesCreateMock.mockResolvedValueOnce({ sid: 'SM1234567890abcdef1234567890abcdef' });

    await expect(
      sendSms({
        to: '(555) 123-4567',
        body: 'Hello from Twilio',
      })
    ).resolves.toEqual({
      success: true,
      to: '(555) 123-4567',
      normalizedTo: '+15551234567',
      sid: 'SM1234567890abcdef1234567890abcdef',
    });

    expect(mockTwilio).toHaveBeenCalledWith(testAccountSid, 'twilio-auth-token', {
      timeout: 15000,
    });
    expect(messagesCreateMock).toHaveBeenCalledWith({
      to: '+15551234567',
      body: 'Hello from Twilio',
      messagingServiceSid: testMessagingServiceSid,
    });
  });

  it('falls back to the configured sender phone number when no Messaging Service SID is present', async () => {
    mockQuery.mockResolvedValueOnce(
      { rows: [makeSettingsRow({ messaging_service_sid: null, from_phone_number: '+1 (555) 555-1212' })] }
    );
    messagesCreateMock.mockResolvedValueOnce({ sid: 'SMabcdef1234567890abcdef1234567890' });

    await expect(
      sendSms({
        to: '+1 555 123 4567',
        body: 'Fallback sender test',
      })
    ).resolves.toEqual({
      success: true,
      to: '+1 555 123 4567',
      normalizedTo: '+15551234567',
      sid: 'SMabcdef1234567890abcdef1234567890',
    });

    expect(messagesCreateMock).toHaveBeenCalledWith({
      to: '+15551234567',
      body: 'Fallback sender test',
      from: '+15555551212',
    });
  });

  it('returns the Twilio error when sendSms fails or times out', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeSettingsRow()] });
    messagesCreateMock.mockRejectedValueOnce(new Error('Request timed out'));

    await expect(
      sendSms({
        to: '+1 555 123 4567',
        body: 'Timeout check',
      })
    ).resolves.toEqual({
      success: false,
      to: '+1 555 123 4567',
      normalizedTo: '+15551234567',
      error: 'Request timed out',
    });

    expect(mockTwilio).toHaveBeenCalledWith(testAccountSid, 'twilio-auth-token', {
      timeout: 15000,
    });
  });

  it('records a successful connection test via the Twilio account resource', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeSettingsRow()] })
      .mockResolvedValueOnce({ rows: [makeSettingsRow()] })
      .mockResolvedValueOnce({ rows: [] });
    accountFetchMock.mockResolvedValueOnce({
      sid: testAccountSid,
    });

    await expect(testTwilioConnection()).resolves.toEqual({
      success: true,
    });

    expect(accountsMock).toHaveBeenCalledWith(testAccountSid);
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE twilio_settings'),
      [true, 'twilio-settings-1']
    );
  });

  it('records a failed connection test when the Twilio account fetch rejects', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeSettingsRow()] })
      .mockResolvedValueOnce({ rows: [makeSettingsRow()] })
      .mockResolvedValueOnce({ rows: [] });
    accountFetchMock.mockRejectedValueOnce(new Error('Authentication failed'));

    await expect(testTwilioConnection()).resolves.toEqual({
      success: false,
      error: 'Authentication failed',
    });

    expect(accountsMock).toHaveBeenCalledWith(testAccountSid);
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE twilio_settings'),
      [false, 'twilio-settings-1']
    );
  });
});
