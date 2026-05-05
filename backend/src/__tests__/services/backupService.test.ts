import { Writable } from 'stream';
import { BackupService, DEFAULT_SECRET_FIELDS } from '../../services/backupService';
import pool from '@config/database';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

describe('BackupService redaction', () => {
  const mockQuery = pool.query as jest.Mock;

  const redact = (service: BackupService, tableName: string, row: Record<string, unknown>) =>
    (
      service as unknown as {
        redactRow(tableName: string, row: Record<string, unknown>): Record<string, unknown>;
      }
    ).redactRow(tableName, row);

  const writeBackupJson = (
    service: BackupService,
    tables: string[],
    meta: { includeSecrets: boolean; generatedAt: Date }
  ) => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });

    return (
      service as unknown as {
        writeBackupJson(
          stream: NodeJS.WritableStream,
          tables: string[],
          meta: { includeSecrets: boolean; generatedAt: Date }
        ): Promise<void>;
      }
    )
      .writeBackupJson(stream, tables, meta)
      .then(() => JSON.parse(chunks.join('')));
  };

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('redacts newer token and challenge storage from default backups', () => {
    const service = new BackupService();

    expect(DEFAULT_SECRET_FIELDS.portal_signup_requests).toContain('password_hash');
    expect(DEFAULT_SECRET_FIELDS.email_settings).toEqual([
      'smtp_pass_encrypted',
      'imap_pass_encrypted',
    ]);
    expect(DEFAULT_SECRET_FIELDS.twilio_settings).toContain('auth_token_encrypted');
    expect(DEFAULT_SECRET_FIELDS.social_media_org_settings).toEqual([
      'app_secret_encrypted',
      'access_token_encrypted',
    ]);
    expect(DEFAULT_SECRET_FIELDS.social_media_pages).toContain('page_access_token_encrypted');
    expect(DEFAULT_SECRET_FIELDS.webhook_endpoints).toContain('secret');
    expect(DEFAULT_SECRET_FIELDS.pending_registration_webauthn_challenges).toContain('challenge');
    expect(DEFAULT_SECRET_FIELDS.user_webauthn_challenges).toContain('challenge');
    expect(DEFAULT_SECRET_FIELDS.password_reset_tokens).toContain('token_hash');
    expect(DEFAULT_SECRET_FIELDS.case_form_access_tokens).toContain('token_hash');
    expect(DEFAULT_SECRET_FIELDS.newsletter_signup_confirmations).toContain('token_hash');
    expect(DEFAULT_SECRET_FIELDS.saved_reports).toContain('public_token');
    expect(DEFAULT_SECRET_FIELDS.saved_report_public_snapshots).toContain('token');

    expect(
      redact(service, 'pending_registration_webauthn_challenges', {
        id: 'challenge-id',
        challenge: 'raw-webauthn-challenge',
        type: 'registration',
      })
    ).toEqual({
      id: 'challenge-id',
      challenge: null,
      type: 'registration',
    });

    expect(
      redact(service, 'case_form_access_tokens', {
        id: 'token-id',
        token_hash: 'hashed-token',
        contact_id: 'contact-id',
      })
    ).toEqual({
      id: 'token-id',
      token_hash: null,
      contact_id: 'contact-id',
    });

    expect(
      redact(service, 'saved_reports', {
        id: 'report-id',
        name: 'Monthly impact',
        public_token: 'public-report-token',
      })
    ).toEqual({
      id: 'report-id',
      name: 'Monthly impact',
      public_token: null,
    });

    expect(
      redact(service, 'portal_signup_requests', {
        id: 'signup-id',
        email: 'portal@example.org',
        password_hash: 'hashed-password',
      })
    ).toEqual({
      id: 'signup-id',
      email: 'portal@example.org',
      password_hash: null,
    });

    expect(
      redact(service, 'email_settings', {
        id: 'email-settings',
        smtp_host: 'smtp.example.org',
        smtp_pass_encrypted: 'enc:smtp',
        imap_pass_encrypted: 'enc:imap',
      })
    ).toEqual({
      id: 'email-settings',
      smtp_host: 'smtp.example.org',
      smtp_pass_encrypted: null,
      imap_pass_encrypted: null,
    });

    expect(
      redact(service, 'twilio_settings', {
        id: 'twilio-settings',
        account_sid: 'AC123',
        auth_token_encrypted: 'enc:twilio',
      })
    ).toEqual({
      id: 'twilio-settings',
      account_sid: 'AC123',
      auth_token_encrypted: null,
    });

    expect(
      redact(service, 'social_media_org_settings', {
        id: 'social-settings',
        app_id: 'app-123',
        app_secret_encrypted: 'enc:app-secret',
        access_token_encrypted: 'enc:access-token',
      })
    ).toEqual({
      id: 'social-settings',
      app_id: 'app-123',
      app_secret_encrypted: null,
      access_token_encrypted: null,
    });

    expect(
      redact(service, 'social_media_pages', {
        id: 'social-page',
        page_name: 'Main page',
        page_access_token_encrypted: 'enc:page-token',
      })
    ).toEqual({
      id: 'social-page',
      page_name: 'Main page',
      page_access_token_encrypted: null,
    });

    expect(
      redact(service, 'webhook_endpoints', {
        id: 'webhook-endpoint',
        url: 'https://example.org/hook',
        secret: 'whsec_secret',
      })
    ).toEqual({
      id: 'webhook-endpoint',
      url: 'https://example.org/hook',
      secret: null,
    });
  });

  it('redacts secret fields from backup output by default', async () => {
    const service = new BackupService();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'smtp_pass_encrypted', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'imap_pass_encrypted', data_type: 'text', is_nullable: 'YES' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'email-settings',
            smtp_pass_encrypted: 'enc:smtp',
            imap_pass_encrypted: 'enc:imap',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const backup = await writeBackupJson(service, ['email_settings'], {
      includeSecrets: false,
      generatedAt: new Date('2026-05-03T12:00:00.000Z'),
    });

    expect(backup.meta.include_secrets).toBe(false);
    expect(backup.tables.email_settings.rows).toEqual([
      {
        id: 'email-settings',
        smtp_pass_encrypted: null,
        imap_pass_encrypted: null,
      },
    ]);
  });

  it('preserves secret fields when includeSecrets is true', async () => {
    const service = new BackupService();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
          { column_name: 'smtp_pass_encrypted', data_type: 'text', is_nullable: 'YES' },
          { column_name: 'imap_pass_encrypted', data_type: 'text', is_nullable: 'YES' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'email-settings',
            smtp_pass_encrypted: 'enc:smtp',
            imap_pass_encrypted: 'enc:imap',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const backup = await writeBackupJson(service, ['email_settings'], {
      includeSecrets: true,
      generatedAt: new Date('2026-05-03T12:00:00.000Z'),
    });

    expect(backup.meta.include_secrets).toBe(true);
    expect(backup.tables.email_settings.rows).toEqual([
      {
        id: 'email-settings',
        smtp_pass_encrypted: 'enc:smtp',
        imap_pass_encrypted: 'enc:imap',
      },
    ]);
  });
});
