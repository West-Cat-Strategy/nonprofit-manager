import pool from '@config/database';
import {
  __resetRegistrationModeCacheForTests,
  getRegistrationSettings,
  updateRegistrationSettings,
  getRegistrationMode,
} from '@services/registrationSettingsService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('registrationSettingsService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
    __resetRegistrationModeCacheForTests();
    jest.useRealTimers();
  });

  it('creates default settings when none exist', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '1', registration_mode: 'disabled', default_role: 'viewer', created_at: new Date(), updated_at: new Date() }] });

    const result = await getRegistrationSettings();
    expect(result.registrationMode).toBe('disabled');
  });

  it('updates settings using current singleton row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: '1', registration_mode: 'disabled', default_role: 'viewer', created_at: new Date(), updated_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [{ id: '1', registration_mode: 'approval_required', default_role: 'manager', created_at: new Date(), updated_at: new Date() }] });

    const result = await updateRegistrationSettings({ registrationMode: 'approval_required', defaultRole: 'manager' }, 'u1');
    expect(result.registrationMode).toBe('approval_required');
    expect(result.defaultRole).toBe('manager');
  });

  it('returns registration mode helper', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', registration_mode: 'approval_required', default_role: 'viewer', created_at: new Date(), updated_at: new Date() }] });
    await expect(getRegistrationMode()).resolves.toBe('approval_required');
  });

  it('caches registration mode within ttl window', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: '1',
          registration_mode: 'approval_required',
          default_role: 'viewer',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    });

    await expect(getRegistrationMode()).resolves.toBe('approval_required');
    await expect(getRegistrationMode()).resolves.toBe('approval_required');

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('expires registration mode cache after ttl', async () => {
    jest.useFakeTimers();
    const now = new Date('2026-03-01T00:00:00.000Z');
    jest.setSystemTime(now);

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            registration_mode: 'disabled',
            default_role: 'viewer',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            registration_mode: 'approval_required',
            default_role: 'viewer',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

    await expect(getRegistrationMode()).resolves.toBe('disabled');
    jest.setSystemTime(new Date(now.getTime() + 30_001));
    await expect(getRegistrationMode()).resolves.toBe('approval_required');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('invalidates registration mode cache on update', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            registration_mode: 'disabled',
            default_role: 'viewer',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            registration_mode: 'disabled',
            default_role: 'viewer',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            registration_mode: 'approval_required',
            default_role: 'manager',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            registration_mode: 'approval_required',
            default_role: 'manager',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

    await expect(getRegistrationMode()).resolves.toBe('disabled');
    await expect(
      updateRegistrationSettings({
        registrationMode: 'approval_required',
        defaultRole: 'manager',
      })
    ).resolves.toMatchObject({ registrationMode: 'approval_required', defaultRole: 'manager' });
    await expect(getRegistrationMode()).resolves.toBe('approval_required');

    expect(mockQuery).toHaveBeenCalledTimes(4);
  });
});
