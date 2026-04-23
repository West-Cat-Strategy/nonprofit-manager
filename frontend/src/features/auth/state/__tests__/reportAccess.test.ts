import { describe, expect, it } from 'vitest';
import {
  canExportReports,
  canManageReports,
  canManageScheduledReports,
  canViewReports,
  canViewScheduledReports,
  getReportAccess,
} from '../reportAccess';

describe('reportAccess', () => {
  it('allows normalized admin users across report capabilities', () => {
    const user = { role: ' Admin ' };

    expect(canViewReports(user)).toBe(true);
    expect(canManageReports(user)).toBe(true);
    expect(canExportReports(user)).toBe(true);
    expect(canViewScheduledReports(user)).toBe(true);
    expect(canManageScheduledReports(user)).toBe(true);
  });

  it('normalizes colon and dot permissions for report access', () => {
    expect(
      getReportAccess({
        role: 'manager',
        permissions: ['report:view', 'report.create', 'scheduled_report:view'],
      })
    ).toEqual({
      canExportReports: false,
      canManageReports: true,
      canManageScheduledReports: false,
      canViewReports: true,
      canViewScheduledReports: true,
    });
  });

  it('returns false for missing users or users without matching permissions', () => {
    expect(getReportAccess({ role: 'viewer', permissions: ['contacts.view'] })).toEqual({
      canExportReports: false,
      canManageReports: false,
      canManageScheduledReports: false,
      canViewReports: false,
      canViewScheduledReports: false,
    });
    expect(getReportAccess(null)).toEqual({
      canExportReports: false,
      canManageReports: false,
      canManageScheduledReports: false,
      canViewReports: false,
      canViewScheduledReports: false,
    });
  });

  it('keeps board-style viewers read-only when they only have saved and scheduled report visibility', () => {
    expect(
      getReportAccess({
        role: 'viewer',
        permissions: ['report:view', 'scheduled_report:view'],
      })
    ).toEqual({
      canExportReports: false,
      canManageReports: false,
      canManageScheduledReports: false,
      canViewReports: true,
      canViewScheduledReports: true,
    });
  });
});
