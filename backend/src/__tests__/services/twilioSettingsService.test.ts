import pool from '@config/database';
import {
  getTwilioSettings,
  hasStoredCredentials,
  updateTwilioSettings,
} from '@services/twilioSettingsService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@utils/encryption', () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
}));

describe('twilioSettingsService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns null when settings row is absent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getTwilioSettings()).resolves.toBeNull();
  });

  it('reports stored auth token flag', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ auth_token_encrypted: 'x' }] });
    await expect(hasStoredCredentials()).resolves.toEqual({ authToken: true });
  });

  it('updates settings and computes configured status', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            account_sid: null,
            auth_token_encrypted: null,
            messaging_service_sid: null,
            from_phone_number: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            account_sid: 'AC123',
            auth_token_encrypted: 'enc:secret',
            messaging_service_sid: 'MG123',
            from_phone_number: null,
            is_configured: true,
            last_tested_at: null,
            last_test_success: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

    const updated = await updateTwilioSettings(
      {
        accountSid: 'AC123',
        authToken: 'secret',
        messagingServiceSid: 'MG123',
      },
      'user-1'
    );

    expect(updated.accountSid).toBe('AC123');
    expect(updated.isConfigured).toBe(true);
  });
});
