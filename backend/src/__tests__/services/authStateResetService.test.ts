const mockScanAndDeleteByPattern = jest.fn();
const mockResetAccountLockoutMemory = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('@config/redis', () => ({
  scanAndDeleteByPattern: (...args: unknown[]) => mockScanAndDeleteByPattern(...args),
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@middleware/accountLockout', () => ({
  LOCKOUT_REDIS_PATTERN: 'auth:lockout:*',
  resetAccountLockoutMemory: (...args: unknown[]) => mockResetAccountLockoutMemory(...args),
}));

describe('authStateResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanAndDeleteByPattern.mockResolvedValueOnce(4).mockResolvedValueOnce(9);
  });

  it('clears persisted auth lockouts and auth rate-limit buckets', async () => {
    const { resetAuthState } = await import('@services/authStateResetService');

    const result = await resetAuthState();

    expect(mockScanAndDeleteByPattern).toHaveBeenNthCalledWith(1, 'auth:lockout:*');
    expect(mockScanAndDeleteByPattern).toHaveBeenNthCalledWith(2, 'rl:auth:*');
    expect(mockResetAccountLockoutMemory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      lockoutKeysDeleted: 4,
      authRateLimitKeysDeleted: 9,
      inMemoryLockoutsCleared: true,
    });
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Auth state reset completed',
      expect.objectContaining({
        lockoutKeysDeleted: 4,
        authRateLimitKeysDeleted: 9,
        inMemoryLockoutsCleared: true,
      })
    );
  });
});
