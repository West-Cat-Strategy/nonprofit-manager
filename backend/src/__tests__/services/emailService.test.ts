import nodemailer from 'nodemailer';
import pool from '@config/database';
import { testSmtpConnection } from '@services/emailService';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@utils/encryption', () => ({
  decrypt: jest.fn(() => 'smtp-password'),
}));

describe('emailService.testSmtpConnection', () => {
  const mockQuery = pool.query as jest.Mock;
  const mockCreateTransport = (nodemailer.createTransport as jest.Mock);
  const verifyMock = jest.fn();

  const makeSettingsRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'email-settings-1',
    smtp_host: 'smtp.example.com',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: 'mailer@example.com',
    smtp_pass_encrypted: 'enc:smtp-password',
    smtp_from_address: 'noreply@example.com',
    smtp_from_name: 'Nonprofit Manager',
    imap_host: null,
    imap_port: 993,
    imap_secure: true,
    imap_user: null,
    imap_pass_encrypted: null,
    is_configured: true,
    last_tested_at: null,
    last_test_success: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateTransport.mockReset();
    verifyMock.mockReset();
    mockCreateTransport.mockReturnValue({ verify: verifyMock });
  });

  it('returns a STARTTLS hint for wrong-version TLS failures on port 587', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeSettingsRow({ smtp_port: 587, smtp_secure: true })] })
      .mockResolvedValueOnce({ rows: [] });
    verifyMock.mockRejectedValueOnce(
      new Error(
        'E8F1FC659A7F0000:error:0A00010B:SSL routines:ssl3_get_record:wrong version number'
      )
    );

    await expect(testSmtpConnection()).resolves.toEqual({
      success: false,
      error: 'SMTP TLS handshake failed. Port 587 usually requires STARTTLS with TLS/SSL unchecked.',
    });

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 587,
        secure: true,
      })
    );
  });

  it('returns an implicit TLS hint for greeting failures on port 465', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeSettingsRow({ smtp_port: 465, smtp_secure: false })] })
      .mockResolvedValueOnce({ rows: [] });
    verifyMock.mockRejectedValueOnce(new Error('Greeting never received'));

    await expect(testSmtpConnection()).resolves.toEqual({
      success: false,
      error: 'SMTP TLS handshake failed. Port 465 usually requires TLS/SSL checked.',
    });

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: false,
      })
    );
  });

  it('returns the original error when it is not a known TLS mismatch', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [makeSettingsRow({ smtp_port: 2525, smtp_secure: false })] })
      .mockResolvedValueOnce({ rows: [] });
    verifyMock.mockRejectedValueOnce(new Error('Authentication failed'));

    await expect(testSmtpConnection()).resolves.toEqual({
      success: false,
      error: 'Authentication failed',
    });
  });
});
