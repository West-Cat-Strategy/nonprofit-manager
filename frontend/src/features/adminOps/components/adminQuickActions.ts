export type AdminQuickActionId =
  | 'admin-hub'
  | 'invite-users'
  | 'organization'
  | 'audit-logs'
  | 'portal-access'
  | 'api-settings'
  | 'email-marketing'
  | 'navigation';

export interface AdminQuickAction {
  id: AdminQuickActionId;
  label: string;
  description: string;
  to: string;
  icon: string;
}

const actionMap: Record<AdminQuickActionId, AdminQuickAction> = {
  'admin-hub': {
    id: 'admin-hub',
    label: 'Admin Hub',
    description: 'Open the main admin command center',
    to: '/settings/admin',
    icon: '🏛️',
  },
  'invite-users': {
    id: 'invite-users',
    label: 'Invite Users',
    description: 'Jump to users and security controls',
    to: '/settings/admin?section=users',
    icon: '➕',
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    description: 'Edit organization profile and preferences',
    to: '/settings/admin?section=organization',
    icon: '🏢',
  },
  'audit-logs': {
    id: 'audit-logs',
    label: 'Audit Logs',
    description: 'Inspect recent administrative activity',
    to: '/settings/admin?section=audit_logs',
    icon: '📜',
  },
  'portal-access': {
    id: 'portal-access',
    label: 'Portal Access',
    description: 'Review and approve portal access requests',
    to: '/settings/admin/portal/access',
    icon: '🔐',
  },
  'api-settings': {
    id: 'api-settings',
    label: 'API Settings',
    description: 'Manage integrations, keys, and webhooks',
    to: '/settings/api',
    icon: '🧩',
  },
  'email-marketing': {
    id: 'email-marketing',
    label: 'Email Marketing',
    description: 'Access campaigns and audience sync',
    to: '/settings/email-marketing',
    icon: '📧',
  },
  navigation: {
    id: 'navigation',
    label: 'Navigation',
    description: 'Configure menus and pinned modules',
    to: '/settings/navigation',
    icon: '🧭',
  },
};

const roleActionIds: Record<string, AdminQuickActionId[]> = {
  admin: [
    'admin-hub',
    'invite-users',
    'organization',
    'audit-logs',
    'portal-access',
    'api-settings',
    'email-marketing',
    'navigation',
  ],
  manager: ['organization', 'api-settings', 'email-marketing', 'navigation'],
  coordinator: ['email-marketing', 'navigation'],
  user: [],
  readonly: [],
  donor: [],
  volunteer: [],
};

export const getAdminQuickActionsForRole = (role?: string): AdminQuickAction[] => {
  const normalizedRole = role?.toLowerCase() ?? 'user';
  const ids = roleActionIds[normalizedRole] ?? roleActionIds.user;
  return ids.map((id) => actionMap[id]);
};
