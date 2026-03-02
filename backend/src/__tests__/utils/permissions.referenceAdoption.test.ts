import { describe, expect, it } from '@jest/globals';
import { hasPermission, Permission } from '@utils/permissions';

describe('reference-adoption permissions', () => {
  it('grants full new-domain permissions to admin and manager', () => {
    const expectedPermissions: Permission[] = [
      Permission.FOLLOWUP_VIEW,
      Permission.FOLLOWUP_CREATE,
      Permission.FOLLOWUP_EDIT,
      Permission.FOLLOWUP_DELETE,
      Permission.SCHEDULED_REPORT_VIEW,
      Permission.SCHEDULED_REPORT_MANAGE,
      Permission.OPPORTUNITY_VIEW,
      Permission.OPPORTUNITY_CREATE,
      Permission.OPPORTUNITY_EDIT,
      Permission.OPPORTUNITY_DELETE,
      Permission.OPPORTUNITY_STAGE_MANAGE,
    ];

    expectedPermissions.forEach((permission) => {
      expect(hasPermission('admin', permission)).toBe(true);
      expect(hasPermission('manager', permission)).toBe(true);
    });
  });

  it('restricts staff/member/volunteer mutation permissions by policy', () => {
    expect(hasPermission('staff', Permission.FOLLOWUP_EDIT)).toBe(true);
    expect(hasPermission('staff', Permission.FOLLOWUP_DELETE)).toBe(false);
    expect(hasPermission('staff', Permission.SCHEDULED_REPORT_VIEW)).toBe(true);
    expect(hasPermission('staff', Permission.SCHEDULED_REPORT_MANAGE)).toBe(false);
    expect(hasPermission('staff', Permission.OPPORTUNITY_STAGE_MANAGE)).toBe(false);

    expect(hasPermission('member', Permission.FOLLOWUP_VIEW)).toBe(true);
    expect(hasPermission('member', Permission.FOLLOWUP_CREATE)).toBe(false);
    expect(hasPermission('member', Permission.OPPORTUNITY_VIEW)).toBe(true);
    expect(hasPermission('member', Permission.OPPORTUNITY_EDIT)).toBe(false);

    expect(hasPermission('volunteer', Permission.SCHEDULED_REPORT_VIEW)).toBe(true);
    expect(hasPermission('volunteer', Permission.OPPORTUNITY_CREATE)).toBe(false);
  });
});
