import pool from '@config/database';
import { getEmailSettings, hasStoredCredentials, updateEmailSettings } from '@services/emailSettingsService';

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

describe('emailSettingsService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns null when settings row is absent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getEmailSettings()).resolves.toBeNull();
  });

  it('reports stored credentials flags', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ smtp_pass_encrypted: 'x', imap_pass_encrypted: null }] });
    await expect(hasStoredCredentials()).resolves.toEqual({ smtp: true, imap: false });
  });

  it('updates settings and returns mapped model', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ smtp_host: 'smtp.a', smtp_user: 'u', smtp_from_address: 'from@x', smtp_pass_encrypted: 'enc' }] })
      .mockResolvedValueOnce({ rows: [{ id: '1', smtp_host: 'smtp.new', smtp_port: 587, smtp_secure: false, smtp_user: 'u', smtp_pass_encrypted: 'enc:x', smtp_from_address: 'from@x', smtp_from_name: null, imap_host: null, imap_port: 993, imap_secure: true, imap_user: null, imap_pass_encrypted: null, is_configured: true, last_tested_at: null, last_test_success: null, created_at: new Date(), updated_at: new Date() }] });

    const updated = await updateEmailSettings({ smtpHost: 'smtp.new', smtpPass: 'x' }, 'u1');
    expect(updated.smtpHost).toBe('smtp.new');
    expect(updated.isConfigured).toBe(true);
  });
});
