import { describe, expect, it } from 'vitest';
import { canAccessAdminSettings } from '../adminAccess';

describe('canAccessAdminSettings', () => {
  it('allows normalized admin users', () => {
    expect(canAccessAdminSettings({ role: 'admin' })).toBe(true);
    expect(canAccessAdminSettings({ role: ' ADMIN ' })).toBe(true);
    expect(canAccessAdminSettings({ role: 'Admin' })).toBe(true);
  });

  it('rejects non-admin and missing users', () => {
    expect(canAccessAdminSettings({ role: 'manager' })).toBe(false);
    expect(canAccessAdminSettings({ role: 'user' })).toBe(false);
    expect(canAccessAdminSettings({ role: 'member' })).toBe(false);
    expect(canAccessAdminSettings({ role: ' ' })).toBe(false);
    expect(canAccessAdminSettings(null)).toBe(false);
    expect(canAccessAdminSettings(undefined)).toBe(false);
  });
});
