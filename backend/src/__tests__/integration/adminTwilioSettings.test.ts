import request from 'supertest';
import twilio from 'twilio';
import app from '../../index';
import pool from '../../config/database';
import { encrypt } from '../../utils/encryption';

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

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

type TwilioSettingsSnapshot = {
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
  created_by: string | null;
  modified_by: string | null;
};

const TWILIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000002';
const CONFIGURED_ACCOUNT_SID = ['AC', '1234567890abcdef1234567890abcdef'].join('');
const CONFIGURED_MESSAGING_SERVICE_SID = ['MG', '1234567890abcdef1234567890abcdef'].join('');
const CONFIGURED_FROM_PHONE = '+15555551234';

describe('Admin Twilio Settings API', () => {
  let adminToken = '';
  let userToken = '';
  let adminEmail = '';
  let userEmail = '';
  let originalSettings: TwilioSettingsSnapshot | null = null;

  const password = 'Test123!Strong';

  const mockTwilio = twilio as unknown as jest.Mock;

  const readTwilioSettingsPayload = (body: Record<string, unknown>) =>
    body.data as Record<string, unknown>;

  const configureTwilioSettings = async (): Promise<void> => {
    await pool.query(
      `UPDATE twilio_settings
          SET account_sid = $2,
              auth_token_encrypted = $3,
              messaging_service_sid = $4,
              from_phone_number = $5,
              is_configured = true,
              last_tested_at = NULL,
              last_test_success = NULL,
              created_by = NULL,
              modified_by = NULL,
              updated_at = NOW()
        WHERE id = $1`,
      [
        TWILIO_SETTINGS_ID,
        CONFIGURED_ACCOUNT_SID,
        encrypt('twilio-auth-token'),
        CONFIGURED_MESSAGING_SERVICE_SID,
        CONFIGURED_FROM_PHONE,
      ]
    );
  };

  beforeAll(async () => {
    await pool.query(
      'INSERT INTO twilio_settings (id, is_configured) VALUES ($1, false) ON CONFLICT DO NOTHING',
      [TWILIO_SETTINGS_ID]
    );

    const snapshot = await pool.query<TwilioSettingsSnapshot>(
      `SELECT id,
              account_sid,
              auth_token_encrypted,
              messaging_service_sid,
              from_phone_number,
              is_configured,
              last_tested_at,
              last_test_success,
              created_at,
              updated_at,
              created_by,
              modified_by
         FROM twilio_settings
        WHERE id = $1`,
      [TWILIO_SETTINGS_ID]
    );
    originalSettings = snapshot.rows[0] ?? null;

    await configureTwilioSettings();

    adminEmail = `twilio-settings-admin-${Date.now()}@example.com`;
    const registerResponse = await request(app).post('/api/v2/auth/register').send({
      email: adminEmail,
      password,
      password_confirm: password,
      first_name: 'Twilio',
      last_name: 'Admin',
    });

    const adminUserId = registerResponse.body?.user?.user_id ?? registerResponse.body?.user?.id;
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminUserId]);

    const adminLogin = await request(app).post('/api/v2/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = adminLogin.body?.token;

    userEmail = `twilio-settings-user-${Date.now()}@example.com`;
    await request(app).post('/api/v2/auth/register').send({
      email: userEmail,
      password,
      password_confirm: password,
      first_name: 'Twilio',
      last_name: 'User',
    });
    const userLogin = await request(app).post('/api/v2/auth/login').send({
      email: userEmail,
      password,
    });
    userToken = userLogin.body?.token;
  });

  beforeEach(() => {
    mockTwilio.mockClear();
    mockTwilio.mockReturnValue(twilioClient);
    messagesCreateMock.mockReset();
    accountFetchMock.mockReset();
    accountsMock.mockClear();
  });

  afterAll(async () => {
    try {
      if (originalSettings) {
        await pool.query(
          `INSERT INTO twilio_settings (
              id,
              account_sid,
              auth_token_encrypted,
              messaging_service_sid,
              from_phone_number,
              is_configured,
              last_tested_at,
              last_test_success,
              created_at,
              updated_at,
              created_by,
              modified_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id)
            DO UPDATE SET
              account_sid = EXCLUDED.account_sid,
              auth_token_encrypted = EXCLUDED.auth_token_encrypted,
              messaging_service_sid = EXCLUDED.messaging_service_sid,
              from_phone_number = EXCLUDED.from_phone_number,
              is_configured = EXCLUDED.is_configured,
              last_tested_at = EXCLUDED.last_tested_at,
              last_test_success = EXCLUDED.last_test_success,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at,
              created_by = EXCLUDED.created_by,
              modified_by = EXCLUDED.modified_by`,
          [
            originalSettings.id,
            originalSettings.account_sid,
            originalSettings.auth_token_encrypted,
            originalSettings.messaging_service_sid,
            originalSettings.from_phone_number,
            originalSettings.is_configured,
            originalSettings.last_tested_at,
            originalSettings.last_test_success,
            originalSettings.created_at,
            originalSettings.updated_at,
            originalSettings.created_by,
            originalSettings.modified_by,
          ]
        );
      }
    } catch {
      // ignore restore failures
    }

    try {
      if (adminEmail) {
        await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
      }
      if (userEmail) {
        await pool.query('DELETE FROM users WHERE email = $1', [userEmail]);
      }
    } catch {
      // ignore cleanup failures
    }
  });

  it('rejects non-admin access', async () => {
    const response = await request(app)
      .get('/api/v2/admin/twilio-settings')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });

  it('returns the current Twilio settings and credential presence for admins', async () => {
    const response = await request(app)
      .get('/api/v2/admin/twilio-settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const payload = readTwilioSettingsPayload(response.body);
    expect(payload.settings).toMatchObject({
      accountSid: CONFIGURED_ACCOUNT_SID,
      messagingServiceSid: CONFIGURED_MESSAGING_SERVICE_SID,
      fromPhoneNumber: CONFIGURED_FROM_PHONE,
      isConfigured: true,
    });
    expect(payload.credentials).toEqual({
      authToken: true,
    });
  });

  it('normalizes blank optional fields and recomputes the configured state', async () => {
    const response = await request(app)
      .put('/api/v2/admin/twilio-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accountSid: '',
        messagingServiceSid: '',
        fromPhoneNumber: '',
      });

    expect(response.status).toBe(200);

    const payload = readTwilioSettingsPayload(response.body);
    expect(payload.settings).toMatchObject({
      accountSid: null,
      messagingServiceSid: null,
      fromPhoneNumber: null,
      isConfigured: false,
    });

    const persisted = await pool.query<TwilioSettingsSnapshot>(
      `SELECT account_sid,
              auth_token_encrypted,
              messaging_service_sid,
              from_phone_number,
              is_configured
         FROM twilio_settings
        WHERE id = $1`,
      [TWILIO_SETTINGS_ID]
    );

    expect(persisted.rows[0]).toMatchObject({
      account_sid: null,
      auth_token_encrypted: expect.any(String),
      messaging_service_sid: null,
      from_phone_number: null,
      is_configured: false,
    });
  });

  it('rejects invalid Twilio SID formats', async () => {
    const response = await request(app)
      .put('/api/v2/admin/twilio-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accountSid: 'AC123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('validation_error');
    expect(response.body.error?.details?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'body',
          path: 'accountSid',
        }),
      ])
    );
  });

  it('reports a successful Twilio connection test', async () => {
    await configureTwilioSettings();
    accountFetchMock.mockResolvedValueOnce({
      sid: CONFIGURED_ACCOUNT_SID,
    });

    const response = await request(app)
      .post('/api/v2/admin/twilio-settings/test')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const payload = readTwilioSettingsPayload(response.body);
    expect(payload.result).toEqual({
      success: true,
    });
    expect(payload.message).toBe('Twilio connection successful');

    const persisted = await pool.query<TwilioSettingsSnapshot>(
      `SELECT last_test_success
         FROM twilio_settings
        WHERE id = $1`,
      [TWILIO_SETTINGS_ID]
    );

    expect(persisted.rows[0]?.last_test_success).toBe(true);
    expect(accountsMock).toHaveBeenCalledWith(CONFIGURED_ACCOUNT_SID);
  });

  it('reports a failed Twilio connection test', async () => {
    await configureTwilioSettings();
    accountFetchMock.mockRejectedValueOnce(new Error('Authentication failed'));

    const response = await request(app)
      .post('/api/v2/admin/twilio-settings/test')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    const payload = readTwilioSettingsPayload(response.body);
    expect(payload.result).toEqual({
      success: false,
      error: 'Authentication failed',
    });
    expect(payload.message).toBe('Twilio connection failed');

    const persisted = await pool.query<TwilioSettingsSnapshot>(
      `SELECT last_test_success
         FROM twilio_settings
        WHERE id = $1`,
      [TWILIO_SETTINGS_ID]
    );

    expect(persisted.rows[0]?.last_test_success).toBe(false);
    expect(accountsMock).toHaveBeenCalledWith(CONFIGURED_ACCOUNT_SID);
  });
});
