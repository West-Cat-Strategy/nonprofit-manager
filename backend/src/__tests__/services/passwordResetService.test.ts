import bcrypt from 'bcryptjs';
import pool from '@config/database';
import {
  requestPasswordReset,
  validateResetToken,
  resetPassword,
} from '@services/passwordResetService';
import { sendPasswordResetEmail } from '@services/emailService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

describe('passwordResetService', () => {
  const mockQuery = pool.query as jest.Mock;
  const mockConnect = pool.connect as jest.Mock;
  const mockSend = sendPasswordResetEmail as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockSend.mockReset();
  });

  it('does nothing for unknown user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(requestPasswordReset('none@example.com')).resolves.toBeUndefined();

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends composite <tokenId>.<secret> reset token for known users', async () => {
    const tokenId = '00000000-0000-0000-0000-000000000001';

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', first_name: 'Avery', email: 'user@example.com' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: tokenId }] });
    mockSend.mockResolvedValueOnce(true);

    await requestPasswordReset('user@example.com');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const token = mockSend.mock.calls[0][1] as string;
    expect(token).toMatch(new RegExp(`^${tokenId}\\.[a-f0-9]{64}$`));
  });

  it('validates new-format token with direct id lookup', async () => {
    const tokenId = '00000000-0000-0000-0000-000000000001';
    const secret = 'a'.repeat(64);
    const tokenHash = await bcrypt.hash(secret, 4);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: tokenId, owner_id: 'user-123', token_hash: tokenHash }],
    });

    await expect(validateResetToken(`${tokenId}.${secret}`)).resolves.toBe('user-123');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE id = $1');
  });

  it('falls back to legacy token scan when token has no separator', async () => {
    const legacyToken = 'legacy-token';
    const tokenHash = await bcrypt.hash(legacyToken, 4);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'legacy-row', owner_id: 'user-legacy', token_hash: tokenHash }],
    });

    await expect(validateResetToken(legacyToken)).resolves.toBe('user-legacy');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
  });

  it('fails fast for malformed composite token format', async () => {
    await expect(resetPassword('not-a-valid-token.', 'NewPass123!')).resolves.toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns false when reset token does not match any active token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(resetPassword('invalid', 'NewPass123!')).resolves.toBe(false);
  });
});
