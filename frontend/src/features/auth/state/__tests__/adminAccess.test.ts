import { describe, expect, it } from 'vitest';
import { canAccessAdminSettings } from '../adminAccess';

describe('canAccessAdminSettings', () => {
  it('allows admin users', () => {
    expect(canAccessAdminSettings({ role: 'admin' })).toBe(true);
  });

  it('rejects non-admin and missing users', () => {
    expect(canAccessAdminSettings({ role: 'manager' })).toBe(false);
    expect(canAccessAdminSettings({ role: 'user' })).toBe(false);
    expect(canAccessAdminSettings(null)).toBe(false);
    expect(canAccessAdminSettings(undefined)).toBe(false);
  });
});
