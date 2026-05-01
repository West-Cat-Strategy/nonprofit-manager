import { getAdminSettingsPath, getPortalAdminPath } from '../adminRoutePaths';
import { normalizeRoleSlug } from '../../auth/state/roleNormalization';

export type AdminQuickActionId =
  | 'pending-approvals'
  | 'admin-hub'
  | 'invite-users'
  | 'organization'
  | 'audit-logs'
  | 'portal-access'
  | 'api-settings'
  | 'communications'
  | 'navigation';

export interface AdminQuickAction {
  id: AdminQuickActionId;
  label: string;
  description: string;
  to: string;
  icon: string;
}

const actionMap: Record<AdminQuickActionId, AdminQuickAction> = {
  'pending-approvals': {
    id: 'pending-approvals',
    label: 'Pending Approvals',
    description: 'Review staff registration requests awaiting a decision',
    to: getAdminSettingsPath('approvals'),
    icon: '⏳',
  },
  'admin-hub': {
    id: 'admin-hub',
    label: 'Admin Hub',
    description: 'Open the hybrid admin settings command center',
    to: getAdminSettingsPath('dashboard'),
    icon: '🏛️',
  },
  'invite-users': {
    id: 'invite-users',
    label: 'Invite Users',
    description: 'Jump to users and security controls',
    to: getAdminSettingsPath('users'),
    icon: '➕',
  },
  organization: {
    id: 'organization',
    label: 'Organization',
    description: 'Edit organization profile and preferences',
    to: getAdminSettingsPath('organization'),
    icon: '🏢',
  },
  'audit-logs': {
    id: 'audit-logs',
    label: 'Audit Logs',
    description: 'Inspect recent administrative activity',
    to: getAdminSettingsPath('audit_logs'),
    icon: '📜',
  },
  'portal-access': {
    id: 'portal-access',
    label: 'Portal Access',
    description: 'Review and approve portal access requests',
    to: getPortalAdminPath('access'),
    icon: '🔐',
  },
  'api-settings': {
    id: 'api-settings',
    label: 'API & Webhooks',
    description: 'Manage integration keys, webhooks, and delivery tooling',
    to: '/settings/api',
    icon: '🧩',
  },
  communications: {
    id: 'communications',
    label: 'Communications',
    description: 'Open local email campaigns and optional Mailchimp tools',
    to: '/settings/communications',
    icon: '📧',
  },
  navigation: {
    id: 'navigation',
    label: 'My Navigation',
    description: 'Choose your menu order and pinned modules',
    to: '/settings/navigation',
    icon: '🧭',
  },
};

const roleActionIds: Record<string, AdminQuickActionId[]> = {
  admin: [
    'pending-approvals',
    'admin-hub',
    'invite-users',
    'organization',
    'audit-logs',
    'portal-access',
    'api-settings',
    'communications',
    'navigation',
  ],
  manager: ['organization', 'api-settings', 'communications', 'navigation'],
  coordinator: ['communications', 'navigation'],
  staff: [],
  user: [],
  viewer: [],
  readonly: [],
  donor: [],
  volunteer: [],
};

export const getAdminQuickActionsForRole = (role?: string): AdminQuickAction[] => {
  const normalizedRole = normalizeRoleSlug(role) ?? 'user';
  const ids = roleActionIds[normalizedRole] ?? roleActionIds.user;
  return ids.map((id) => actionMap[id]);
};
