/**
 * Permissions Utility
 * Role-based permission checking and helpers
 * Inspired by wc-manage permission patterns
 */

import { normalizeRoleSlug } from '@utils/roleSlug';

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

  // Grants Management
  GRANT_VIEW = 'grant:view',
  GRANT_CREATE = 'grant:create',
  GRANT_EDIT = 'grant:edit',
  GRANT_DELETE = 'grant:delete',
  GRANT_EXPORT = 'grant:export',

  // Reporting
  REPORT_VIEW = 'report:view',
  REPORT_CREATE = 'report:create',
  REPORT_EXPORT = 'report:export',
  SCHEDULED_REPORT_VIEW = 'scheduled_report:view',
  SCHEDULED_REPORT_MANAGE = 'scheduled_report:manage',
  OUTCOMES_MANAGE = 'outcomes.manage',
  OUTCOMES_VIEW_REPORTS = 'outcomes.viewReports',
  OUTCOMES_TAG_INTERACTION = 'outcomes.tagInteraction',

  // Follow-up Lifecycle
  FOLLOWUP_VIEW = 'followup:view',
  FOLLOWUP_CREATE = 'followup:create',
  FOLLOWUP_EDIT = 'followup:edit',
  FOLLOWUP_DELETE = 'followup:delete',

  // Opportunities Pipeline
  OPPORTUNITY_VIEW = 'opportunity:view',
  OPPORTUNITY_CREATE = 'opportunity:create',
  OPPORTUNITY_EDIT = 'opportunity:edit',
  OPPORTUNITY_DELETE = 'opportunity:delete',
  OPPORTUNITY_STAGE_MANAGE = 'opportunity:stage:manage',

  // Team Chat
  TEAM_CHAT_VIEW = 'team_chat:view',
  TEAM_CHAT_POST = 'team_chat:post',
  TEAM_CHAT_MANAGE = 'team_chat:manage',

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

type CanonicalPermissionRole = 'admin' | 'manager' | 'staff' | 'volunteer' | 'viewer';

// Role-based permission matrix
// Maps canonical roles to their allowed permissions.
const ROLE_PERMISSIONS: Record<CanonicalPermissionRole, Permission[]> = {
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
    Permission.GRANT_VIEW,
    Permission.GRANT_CREATE,
    Permission.GRANT_EDIT,
    Permission.GRANT_DELETE,
    Permission.GRANT_EXPORT,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.SCHEDULED_REPORT_VIEW,
    Permission.SCHEDULED_REPORT_MANAGE,
    Permission.OUTCOMES_MANAGE,
    Permission.OUTCOMES_VIEW_REPORTS,
    Permission.OUTCOMES_TAG_INTERACTION,
    Permission.FOLLOWUP_VIEW,
    Permission.FOLLOWUP_CREATE,
    Permission.FOLLOWUP_EDIT,
    Permission.FOLLOWUP_DELETE,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_EDIT,
    Permission.OPPORTUNITY_DELETE,
    Permission.OPPORTUNITY_STAGE_MANAGE,
    Permission.TEAM_CHAT_VIEW,
    Permission.TEAM_CHAT_POST,
    Permission.TEAM_CHAT_MANAGE,
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
    Permission.GRANT_VIEW,
    Permission.GRANT_CREATE,
    Permission.GRANT_EDIT,
    Permission.GRANT_EXPORT,
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.SCHEDULED_REPORT_VIEW,
    Permission.SCHEDULED_REPORT_MANAGE,
    Permission.OUTCOMES_VIEW_REPORTS,
    Permission.OUTCOMES_TAG_INTERACTION,
    Permission.FOLLOWUP_VIEW,
    Permission.FOLLOWUP_CREATE,
    Permission.FOLLOWUP_EDIT,
    Permission.FOLLOWUP_DELETE,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_EDIT,
    Permission.OPPORTUNITY_DELETE,
    Permission.OPPORTUNITY_STAGE_MANAGE,
    Permission.TEAM_CHAT_VIEW,
    Permission.TEAM_CHAT_POST,
    Permission.TEAM_CHAT_MANAGE,
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
    Permission.GRANT_VIEW,
    Permission.GRANT_CREATE,
    Permission.GRANT_EDIT,
    Permission.GRANT_EXPORT,
    Permission.REPORT_VIEW,
    Permission.SCHEDULED_REPORT_VIEW,
    Permission.FOLLOWUP_VIEW,
    Permission.FOLLOWUP_CREATE,
    Permission.FOLLOWUP_EDIT,
    Permission.OPPORTUNITY_VIEW,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_EDIT,
    Permission.TEAM_CHAT_VIEW,
    Permission.TEAM_CHAT_POST,
    Permission.OUTCOMES_TAG_INTERACTION,
    Permission.DASHBOARD_VIEW,
    Permission.TEMPLATE_VIEW,
  ],

  viewer: [
    // Viewer has limited view access
    Permission.VOLUNTEER_VIEW,
    Permission.HOURS_VIEW,
    Permission.EVENT_VIEW,
    Permission.CASE_VIEW,
    Permission.CONTACT_VIEW,
    Permission.REPORT_VIEW,
    Permission.SCHEDULED_REPORT_VIEW,
    Permission.FOLLOWUP_VIEW,
    Permission.OPPORTUNITY_VIEW,
    Permission.DASHBOARD_VIEW,
  ],

  volunteer: [
    // Volunteer has self-service access only
    Permission.HOURS_CREATE,
    Permission.EVENT_VIEW,
    Permission.SCHEDULED_REPORT_VIEW,
    Permission.FOLLOWUP_VIEW,
    Permission.OPPORTUNITY_VIEW,
    Permission.DASHBOARD_VIEW,
  ],
};

const normalizeCandidateRole = (role: string): CanonicalPermissionRole | null => {
  const normalizedRole = normalizeRoleSlug(role);
  return normalizedRole ? (normalizedRole as CanonicalPermissionRole) : null;
};

const getCandidatePermissions = (role: string): Permission[] => {
  const normalizedRole = normalizeCandidateRole(role);
  return normalizedRole ? ROLE_PERMISSIONS[normalizedRole] || [] : [];
};

export const normalizePermissionRoles = (roles: string[]): CanonicalPermissionRole[] =>
  Array.from(
    new Set(
      roles
        .map((role) => normalizeCandidateRole(role))
        .filter((role): role is CanonicalPermissionRole => role !== null)
    )
  );

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission | string): boolean {
  return getCandidatePermissions(role).includes(permission as Permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: string,
  permissions: (Permission | string)[]
): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

export function hasPermissionForRoles(
  roles: string[],
  permission: Permission | string
): boolean {
  return normalizePermissionRoles(roles).some((role) =>
    ROLE_PERMISSIONS[role].includes(permission as Permission)
  );
}

export function hasAnyPermissionForRoles(
  roles: string[],
  permissions: (Permission | string)[]
): boolean {
  return permissions.some((permission) => hasPermissionForRoles(roles, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: string,
  permissions: (Permission | string)[]
): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return getCandidatePermissions(role);
}

/**
 * Check if user is admin
 */
export function isAdmin(role: string): boolean {
  return normalizeRoleSlug(role) === 'admin';
}

/**
 * Check if user is manager or above
 */
export function isManagerOrAbove(role: string): boolean {
  const normalizedRole = normalizeRoleSlug(role);
  return normalizedRole === 'admin' || normalizedRole === 'manager';
}

/**
 * Check if user is staff or above
 */
export function isStaffOrAbove(role: string): boolean {
  const normalizedRole = normalizeRoleSlug(role);
  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'manager' ||
    normalizedRole === 'staff'
  );
}

/**
 * Check if user can perform volunteer operations
 */
export function canManageVolunteers(role: string): boolean {
  return hasPermission(role, Permission.VOLUNTEER_EDIT);
}

/**
 * Check if user can approve volunteer hours
 */
export function canApproveHours(role: string): boolean {
  return hasPermission(role, Permission.HOURS_APPROVE);
}

/**
 * Check if user can manage organization settings
 */
export function canManageOrganization(role: string): boolean {
  return hasPermission(role, Permission.ADMIN_ORGANIZATION);
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(role: string): boolean {
  return hasPermission(role, Permission.ADMIN_AUDIT);
}

/**
 * Check if user can manage admins/users
 */
export function canManageUsers(role: string): boolean {
  return hasPermission(role, Permission.ADMIN_USERS);
}

/**
 * Check if user can manage grants
 */
export function canManageGrants(role: string): boolean {
  return hasAnyPermission(role, [
    Permission.GRANT_VIEW,
    Permission.GRANT_CREATE,
    Permission.GRANT_EDIT,
    Permission.GRANT_DELETE,
    Permission.GRANT_EXPORT,
  ]);
}

/**
 * Check if user can export data
 */
export function canExportData(
  role: string,
  dataType: 'volunteers' | 'contacts' | 'analytics'
): boolean {
  const permissions: Record<string, Permission> = {
    volunteers: Permission.VOLUNTEER_EXPORT,
    contacts: Permission.CONTACT_EXPORT,
    analytics: Permission.ANALYTICS_EXPORT,
  };

  return hasPermission(role, permissions[dataType]);
}
