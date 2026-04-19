import {
  Permission,
  canExportData,
  getPermissionsForRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@utils/permissions';

describe('permissions seam', () => {
  it('normalizes legacy role aliases to the canonical permission matrix', () => {
    expect(hasPermission('user', Permission.CONTACT_EDIT)).toBe(true);
    expect(hasPermission('member', Permission.CONTACT_VIEW)).toBe(true);
    expect(hasPermission('readonly', Permission.REPORT_VIEW)).toBe(true);

    expect(getPermissionsForRole('user')).toEqual(getPermissionsForRole('staff'));
    expect(getPermissionsForRole('member')).toEqual(getPermissionsForRole('viewer'));
    expect(getPermissionsForRole('readonly')).toEqual(getPermissionsForRole('viewer'));
  });

  it('enforces canonical grants and denials for operational and admin permissions', () => {
    expect(hasPermission('admin', Permission.ADMIN_USERS)).toBe(true);
    expect(hasPermission('manager', Permission.ADMIN_USERS)).toBe(false);
    expect(hasPermission('manager', Permission.ADMIN_ORGANIZATION)).toBe(true);
    expect(hasPermission('staff', Permission.EVENT_EDIT)).toBe(true);
    expect(hasPermission('viewer', Permission.EVENT_EDIT)).toBe(false);
    expect(hasPermission('volunteer', Permission.HOURS_CREATE)).toBe(true);
    expect(hasPermission('volunteer', Permission.EVENT_CREATE)).toBe(false);
  });

  it('keeps aggregate permission helpers aligned with canonical role grants', () => {
    expect(
      hasAnyPermission('user', [Permission.ADMIN_USERS, Permission.CONTACT_EDIT])
    ).toBe(true);
    expect(
      hasAllPermissions('manager', [Permission.REPORT_VIEW, Permission.CONTACT_VIEW])
    ).toBe(true);
    expect(
      hasAllPermissions('manager', [Permission.REPORT_VIEW, Permission.ADMIN_USERS])
    ).toBe(false);
    expect(canExportData('admin', 'analytics')).toBe(true);
    expect(canExportData('member', 'analytics')).toBe(false);
  });

  it('returns no permissions for unknown roles', () => {
    expect(getPermissionsForRole('ghost-role')).toEqual([]);
    expect(hasPermission('ghost-role', Permission.EVENT_VIEW)).toBe(false);
  });
});
