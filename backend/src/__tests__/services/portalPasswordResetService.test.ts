import bcrypt from 'bcryptjs';
import pool from '@config/database';
import {
  requestPortalPasswordReset,
  resetPortalPassword,
  validatePortalResetToken,
} from '@services/portalPasswordResetService';
import { sendPortalPasswordResetEmail } from '@services/emailService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@services/emailService', () => ({
  sendPortalPasswordResetEmail: jest.fn(),
}));

describe('portalPasswordResetService', () => {
  const mockQuery = pool.query as jest.Mock;
  const mockConnect = pool.connect as jest.Mock;
  const mockSend = sendPortalPasswordResetEmail as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockSend.mockReset();
  });

  it('does nothing for unknown portal user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(requestPortalPasswordReset('none@example.com')).resolves.toBeUndefined();

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends composite <tokenId>.<secret> reset token for known portal users', async () => {
    const tokenId = '123e4567-e89b-12d3-a456-426614174000';

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'portal-user-1', email: 'user@example.com', first_name: 'Avery' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: tokenId }] });
    mockSend.mockResolvedValueOnce(true);

    await requestPortalPasswordReset('user@example.com');

    expect(mockSend).toHaveBeenCalledTimes(1);
    const token = mockSend.mock.calls[0][1] as string;
    expect(token).toMatch(new RegExp(`^${tokenId}\\.[a-f0-9]{64}$`));
  });

  it('validates new-format portal token with direct id lookup', async () => {
    const tokenId = '123e4567-e89b-12d3-a456-426614174000';
    const secret = 'a'.repeat(64);
    const tokenHash = await bcrypt.hash(secret, 4);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: tokenId, owner_id: 'portal-user-123', token_hash: tokenHash }],
    });

    await expect(validatePortalResetToken(`${tokenId}.${secret}`)).resolves.toBe('portal-user-123');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE id = $1');
  });

  it('falls back to legacy portal token scan when token has no separator', async () => {
    const legacyToken = 'legacy-token';
    const tokenHash = await bcrypt.hash(legacyToken, 4);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'legacy-row', owner_id: 'portal-user-legacy', token_hash: tokenHash }],
    });

    await expect(validatePortalResetToken(legacyToken)).resolves.toBe('portal-user-legacy');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
  });

  it('fails fast for malformed portal composite token format', async () => {
    await expect(resetPortalPassword('not-a-valid-token.', 'NewPass123!')).resolves.toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns false when portal reset token does not match any active token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(resetPortalPassword('invalid', 'NewPass123!')).resolves.toBe(false);
  });
});
