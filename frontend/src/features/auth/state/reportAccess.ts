import type { User } from './authCore';
import { isAdminRole } from './roleNormalization';

type ReportAccessUser = (Pick<User, 'role'> & { permissions?: string[] }) | null | undefined;

const normalizePermission = (permission: string): string =>
  permission.trim().toLowerCase().replace(/:/g, '.');

const hasPermission = (permissions: string[] | undefined, targetPermission: string): boolean => {
  const normalizedTarget = normalizePermission(targetPermission);
  return Boolean(
    permissions?.some(
      (permission) => normalizePermission(permission) === normalizedTarget
    )
  );
};

export const canViewReports = (user: ReportAccessUser): boolean =>
  isAdminRole(user?.role) || hasPermission(user?.permissions, 'report:view');

export const canManageReports = (user: ReportAccessUser): boolean =>
  isAdminRole(user?.role) || hasPermission(user?.permissions, 'report:create');

export const canExportReports = (user: ReportAccessUser): boolean =>
  isAdminRole(user?.role) || hasPermission(user?.permissions, 'report:export');

export const canViewScheduledReports = (user: ReportAccessUser): boolean =>
  isAdminRole(user?.role) || hasPermission(user?.permissions, 'scheduled_report:view');

export const canManageScheduledReports = (user: ReportAccessUser): boolean =>
  isAdminRole(user?.role) || hasPermission(user?.permissions, 'scheduled_report:manage');

export const getReportAccess = (user: ReportAccessUser) => ({
  canExportReports: canExportReports(user),
  canManageReports: canManageReports(user),
  canManageScheduledReports: canManageScheduledReports(user),
  canViewReports: canViewReports(user),
  canViewScheduledReports: canViewScheduledReports(user),
});
