/**
 * Permissions Utility
 * Role-based permission checking and helpers
 * Inspired by wc-manage permission patterns
 */

import type { UserRole } from '../validations/user';

// Define all possible permissions in the system
export enum Permission {
  // Volunteer Management
  VOLUNTEER_VIEW = 'volunteer:view',
  VOLUNTEER_CREATE = 'volunteer:create',
  VOLUNTEER_EDIT = 'volunteer:edit',
  VOLUNTEER_DELETE = 'volunteer:delete',
  VOLUNTEER_EXPORT = 'volunteer:export',

  // Volunteer Hours
  HOURS_VIEW = 'hours:view',
  HOURS_CREATE = 'hours:create',
  HOURS_EDIT = 'hours:edit',
  HOURS_APPROVE = 'hours:approve',
  HOURS_DELETE = 'hours:delete',

  // Events Management
  EVENT_VIEW = 'event:view',
  EVENT_CREATE = 'event:create',
  EVENT_EDIT = 'event:edit',
  EVENT_DELETE = 'event:delete',

  // Case Management
  CASE_VIEW = 'case:view',
  CASE_CREATE = 'case:create',
  CASE_EDIT = 'case:edit',
  CASE_DELETE = 'case:delete',

  // Contact Management
  CONTACT_VIEW = 'contact:view',
  CONTACT_CREATE = 'contact:create',
  CONTACT_EDIT = 'contact:edit',
  CONTACT_DELETE = 'contact:delete',
  CONTACT_EXPORT = 'contact:export',

  // Financial Management
  DONATION_VIEW = 'donation:view',
  DONATION_CREATE = 'donation:create',
  DONATION_EDIT = 'donation:edit',
  DONATION_DELETE = 'donation:delete',
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_PROCESS = 'payment:process',

  // Reporting
  REPORT_VIEW = 'report:view',
  REPORT_CREATE = 'report:create',
  REPORT_EXPORT = 'report:export',
  OUTCOMES_MANAGE = 'outcomes.manage',
  OUTCOMES_VIEW_REPORTS = 'outcomes.viewReports',
  OUTCOMES_TAG_INTERACTION = 'outcomes.tagInteraction',

  // Admin/Organization
  ADMIN_USERS = 'admin:users',
  ADMIN_ORGANIZATION = 'admin:organization',
  ADMIN_SETTINGS = 'admin:settings',
  ADMIN_AUDIT = 'admin:audit',
  ADMIN_BRANDING = 'admin:branding',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',

  // Templates
  TEMPLATE_VIEW = 'template:view',
  TEMPLATE_MANAGE = 'template:manage',
}

// Role-based permission matrix
// Maps roles to their allowed permissions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admin has all permissions
    Permission.VOLUNTEER_VIEW,
    Permission.VOLUNTEER_CREATE,
    Permission.VOLUNTEER_EDIT,
    Permission.VOLUNTEER_DELETE,
    Permission.VOLUNTEER_EXPORT,
    Permission.HOURS_VIEW,
    Permission.HOURS_CREATE,
    Permission.HOURS_EDIT,
    Permission.HOURS_APPROVE,
    Permission.HOURS_DELETE,
    Permission.EVENT_VIEW,
    Permission.EVENT_CREATE,
    Permission.EVENT_EDIT,
    Permission.EVENT_DELETE,
    Permission.CASE_VIEW,
    Permission.CASE_CREATE,
    Permission.CASE_EDIT,
    Permission.CASE_DELETE,
    Permission.CONTACT_VIEW,
    Permission.CONTACT_CREATE,
    Permission.CONTACT_EDIT,
    Permission.CONTACT_DELETE,
    Permission.CONTACT_EXPORT,
    Permission.DONATION_VIEW,
    Permission.DONATION_CREATE,
    Permission.DONATION_EDIT,
    Permission.DONATION_DELETE,
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.OUTCOMES_MANAGE,
    Permission.OUTCOMES_VIEW_REPORTS,
    Permission.OUTCOMES_TAG_INTERACTION,
    Permission.ADMIN_USERS,
    Permission.ADMIN_ORGANIZATION,
    Permission.ADMIN_SETTINGS,
    Permission.ADMIN_AUDIT,
    Permission.ADMIN_BRANDING,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.DASHBOARD_VIEW,
    Permission.TEMPLATE_VIEW,
    Permission.TEMPLATE_MANAGE,
  ],

  manager: [
    // Manager has full access to operational features, limited admin
    Permission.VOLUNTEER_VIEW,
    Permission.VOLUNTEER_CREATE,
    Permission.VOLUNTEER_EDIT,
    Permission.VOLUNTEER_DELETE,
    Permission.VOLUNTEER_EXPORT,
    Permission.HOURS_VIEW,
    Permission.HOURS_CREATE,
    Permission.HOURS_EDIT,
    Permission.HOURS_APPROVE,
    Permission.HOURS_DELETE,
    Permission.EVENT_VIEW,
    Permission.EVENT_CREATE,
    Permission.EVENT_EDIT,
    Permission.EVENT_DELETE,
    Permission.CASE_VIEW,
    Permission.CASE_CREATE,
    Permission.CASE_EDIT,
    Permission.CASE_DELETE,
    Permission.CONTACT_VIEW,
    Permission.CONTACT_CREATE,
    Permission.CONTACT_EDIT,
    Permission.CONTACT_DELETE,
    Permission.CONTACT_EXPORT,
    Permission.DONATION_VIEW,
    Permission.DONATION_CREATE,
    Permission.DONATION_EDIT,
    Permission.PAYMENT_VIEW,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.OUTCOMES_VIEW_REPORTS,
    Permission.OUTCOMES_TAG_INTERACTION,
    Permission.ANALYTICS_VIEW,
    Permission.DASHBOARD_VIEW,
    Permission.TEMPLATE_VIEW,
    Permission.ADMIN_ORGANIZATION,
  ],

  staff: [
    // Staff can view and edit operational data but no admin/financial
    Permission.VOLUNTEER_VIEW,
    Permission.VOLUNTEER_CREATE,
    Permission.VOLUNTEER_EDIT,
    Permission.HOURS_VIEW,
    Permission.HOURS_CREATE,
    Permission.HOURS_EDIT,
    Permission.EVENT_VIEW,
    Permission.EVENT_CREATE,
    Permission.EVENT_EDIT,
    Permission.CASE_VIEW,
    Permission.CASE_CREATE,
    Permission.CASE_EDIT,
    Permission.CONTACT_VIEW,
    Permission.CONTACT_CREATE,
    Permission.CONTACT_EDIT,
    Permission.DONATION_VIEW,
    Permission.REPORT_VIEW,
    Permission.OUTCOMES_TAG_INTERACTION,
    Permission.DASHBOARD_VIEW,
    Permission.TEMPLATE_VIEW,
  ],

  member: [
    // Member has limited view access
    Permission.VOLUNTEER_VIEW,
    Permission.HOURS_VIEW,
    Permission.EVENT_VIEW,
    Permission.CASE_VIEW,
    Permission.CONTACT_VIEW,
    Permission.REPORT_VIEW,
    Permission.DASHBOARD_VIEW,
  ],

  volunteer: [
    // Volunteer has self-service access only
    Permission.HOURS_CREATE,
    Permission.EVENT_VIEW,
    Permission.DASHBOARD_VIEW,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | string, permission: Permission | string): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;

  return permissions.includes(permission as Permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole | string,
  permissions: (Permission | string)[]
): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole | string,
  permissions: (Permission | string)[]
): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole | string): Permission[] {
  return ROLE_PERMISSIONS[role as UserRole] || [];
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | string): boolean {
  return role === 'admin';
}

/**
 * Check if user is manager or above
 */
export function isManagerOrAbove(role: UserRole | string): boolean {
  return role === 'admin' || role === 'manager';
}

/**
 * Check if user is staff or above
 */
export function isStaffOrAbove(role: UserRole | string): boolean {
  return role === 'admin' || role === 'manager' || role === 'staff';
}

/**
 * Check if user can perform volunteer operations
 */
export function canManageVolunteers(role: UserRole | string): boolean {
  return hasPermission(role, Permission.VOLUNTEER_EDIT);
}

/**
 * Check if user can approve volunteer hours
 */
export function canApproveHours(role: UserRole | string): boolean {
  return hasPermission(role, Permission.HOURS_APPROVE);
}

/**
 * Check if user can manage organization settings
 */
export function canManageOrganization(role: UserRole | string): boolean {
  return hasPermission(role, Permission.ADMIN_ORGANIZATION);
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(role: UserRole | string): boolean {
  return hasPermission(role, Permission.ADMIN_AUDIT);
}

/**
 * Check if user can manage admins/users
 */
export function canManageUsers(role: UserRole | string): boolean {
  return hasPermission(role, Permission.ADMIN_USERS);
}

/**
 * Check if user can export data
 */
export function canExportData(
  role: UserRole | string,
  dataType: 'volunteers' | 'contacts' | 'analytics'
): boolean {
  const permissions: Record<string, Permission> = {
    volunteers: Permission.VOLUNTEER_EXPORT,
    contacts: Permission.CONTACT_EXPORT,
    analytics: Permission.ANALYTICS_EXPORT,
  };

  return hasPermission(role, permissions[dataType]);
}
