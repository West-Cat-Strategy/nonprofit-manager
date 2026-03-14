import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

type EmailSettingsSnapshot = {
  id: string;
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_pass_encrypted: string | null;
  smtp_from_address: string | null;
  smtp_from_name: string | null;
  imap_host: string | null;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string | null;
  imap_pass_encrypted: string | null;
  is_configured: boolean;
  last_tested_at: Date | null;
  last_test_success: boolean | null;
  created_by: string | null;
  modified_by: string | null;
};

const EMAIL_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

describe('Admin Email Settings API', () => {
  let adminToken = '';
  let adminEmail = '';
  let originalSettings: EmailSettingsSnapshot | null = null;

  const password = 'Test123!Strong';

  beforeAll(async () => {
    await pool.query(
      'INSERT INTO email_settings (id, is_configured) VALUES ($1, false) ON CONFLICT DO NOTHING',
      [EMAIL_SETTINGS_ID]
    );

    const snapshot = await pool.query<EmailSettingsSnapshot>(
      `SELECT id,
              smtp_host,
              smtp_port,
              smtp_secure,
              smtp_user,
              smtp_pass_encrypted,
              smtp_from_address,
              smtp_from_name,
              imap_host,
              imap_port,
              imap_secure,
              imap_user,
              imap_pass_encrypted,
              is_configured,
              last_tested_at,
              last_test_success,
              created_by,
              modified_by
         FROM email_settings
        ORDER BY created_at
        LIMIT 1`
    );
    originalSettings = snapshot.rows[0] ?? null;

    adminEmail = `email-settings-admin-${Date.now()}@example.com`;
    const registerResponse = await request(app).post('/api/v2/auth/register').send({
      email: adminEmail,
      password,
      password_confirm: password,
      first_name: 'Email',
      last_name: 'Admin',
    });

    const adminUserId = registerResponse.body?.user?.user_id ?? registerResponse.body?.user?.id;
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminUserId]);

    const loginResponse = await request(app).post('/api/v2/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = loginResponse.body?.token;
  });

  afterAll(async () => {
    try {
      if (originalSettings) {
        await pool.query(
          `UPDATE email_settings
              SET smtp_host = $2,
                  smtp_port = $3,
                  smtp_secure = $4,
                  smtp_user = $5,
                  smtp_pass_encrypted = $6,
                  smtp_from_address = $7,
                  smtp_from_name = $8,
                  imap_host = $9,
                  imap_port = $10,
                  imap_secure = $11,
                  imap_user = $12,
                  imap_pass_encrypted = $13,
                  is_configured = $14,
                  last_tested_at = $15,
                  last_test_success = $16,
                  created_by = $17,
                  modified_by = $18,
                  updated_at = NOW()
            WHERE id = $1`,
          [
            originalSettings.id,
            originalSettings.smtp_host,
            originalSettings.smtp_port,
            originalSettings.smtp_secure,
            originalSettings.smtp_user,
            originalSettings.smtp_pass_encrypted,
            originalSettings.smtp_from_address,
            originalSettings.smtp_from_name,
            originalSettings.imap_host,
            originalSettings.imap_port,
            originalSettings.imap_secure,
            originalSettings.imap_user,
            originalSettings.imap_pass_encrypted,
            originalSettings.is_configured,
            originalSettings.last_tested_at,
            originalSettings.last_test_success,
            originalSettings.created_by,
            originalSettings.modified_by,
          ]
        );
      }
    } catch {
      // ignore restore failures during test cleanup
    }

    try {
      if (adminEmail) {
        await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
      }
    } catch {
      // ignore user cleanup failures
    }
  });

  it('normalizes whitespace-only optional fields into cleared values', async () => {
    const response = await request(app)
      .put('/api/v2/admin/email-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        smtpHost: '   ',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '   ',
        smtpFromAddress: '   ',
        smtpFromName: '   ',
        imapHost: '   ',
        imapPort: 993,
        imapSecure: true,
        imapUser: '   ',
      });

    expect(response.status).toBe(200);
    const payload = response.body.data?.data ?? response.body.data;
    expect(payload).toMatchObject({
      smtpHost: null,
      smtpUser: null,
      smtpFromAddress: null,
      smtpFromName: null,
      imapHost: null,
      imapUser: null,
      isConfigured: false,
    });

    const persisted = await pool.query<EmailSettingsSnapshot>(
      `SELECT smtp_host,
              smtp_user,
              smtp_from_address,
              smtp_from_name,
              imap_host,
              imap_user,
              is_configured
         FROM email_settings
        WHERE id = $1`,
      [EMAIL_SETTINGS_ID]
    );

    expect(persisted.rows[0]).toMatchObject({
      smtp_host: null,
      smtp_user: null,
      smtp_from_address: null,
      smtp_from_name: null,
      imap_host: null,
      imap_user: null,
      is_configured: false,
    });
  });

  it('keeps invalid non-empty email values as validation errors', async () => {
    const response = await request(app)
      .put('/api/v2/admin/email-settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        smtpFromAddress: 'not-an-email',
      });

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('validation_error');
    expect(response.body.error?.details?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'body',
          path: 'smtpFromAddress',
        }),
      ])
    );
  });
});
