import pool from '@config/database';
import {
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
});
