import pool from '@config/database';
import { requestPasswordReset, validateResetToken, resetPassword } from '@services/passwordResetService';
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

  it('returns null for invalid validation token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(validateResetToken('invalid')).resolves.toBeNull();
  });

  it('returns false when reset token does not match', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(resetPassword('invalid', 'NewPass123!')).resolves.toBe(false);
  });
});
