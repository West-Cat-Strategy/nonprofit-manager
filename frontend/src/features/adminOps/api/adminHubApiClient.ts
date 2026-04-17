import api from '../../../services/api';
import {
  getAdminRouteDefinition,
  type AdminRouteId,
} from '../adminNavigationCatalog';
import type {
  AdminEmailSettings,
  AdminTwilioSettings,
  AdminWorkspaceStatusCard,
  EmailSettingsBundle,
  OrganizationSettings,
  PendingRegistration,
  PendingRegistrationList,
  TwilioSettingsBundle,
} from '../contracts';

export type RegistrationMode = 'disabled' | 'approval_required';

export interface RegistrationSettings {
  id: string;
  registrationMode: RegistrationMode;
  defaultRole: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalContacts: number;
  recentDonations: number;
  recentSignups: Array<{ id: string; email: string; created_at: string }>;
}

export interface ProviderTestResult {
  success: boolean;
  error?: string | null;
}

type AuditSummary = {
  total?: number;
};

type MailchimpStatus = {
  configured?: boolean;
  listCount?: number;
  accountName?: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readArray = <T,>(value: unknown, keys: string[] = []): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
};

const readEmailSettings = (value: unknown): AdminEmailSettings | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const candidate = asRecord(record.settings) ?? asRecord(record.data) ?? record;
  return candidate as unknown as AdminEmailSettings;
};

const readTwilioSettings = (value: unknown): AdminTwilioSettings | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const candidate = asRecord(record.settings) ?? asRecord(record.data) ?? record;
  return candidate as unknown as AdminTwilioSettings;
};

const readCredentials = <T extends Record<string, boolean>>(
  value: unknown,
  fallback: T
): T => {
  const record = asRecord(value);
  const candidate = asRecord(record?.credentials);

  return candidate ? ({ ...fallback, ...candidate } as T) : fallback;
};

const readProviderTestResult = (value: unknown): ProviderTestResult => {
  const record = asRecord(value);
  const candidate = asRecord(record?.result) ?? asRecord(record?.data) ?? record;

  return {
    success: Boolean(candidate?.success),
    error: typeof candidate?.error === 'string' ? candidate.error : null,
  };
};

const readPendingRegistrations = (value: unknown): PendingRegistration[] =>
  readArray<PendingRegistration>(value, ['items', 'data']);

const getPath = (routeId: AdminRouteId): string => getAdminRouteDefinition(routeId).path;

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const response = await api.get<OrganizationSettings>('/admin/organization-settings');
  return response.data;
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
}

export async function getEmailSettingsBundle(): Promise<EmailSettingsBundle> {
  const response = await api.get('/admin/email-settings');
  return {
    settings: readEmailSettings(response.data),
    credentials: readCredentials(response.data, { smtp: false, imap: false }),
  };
}

export async function updateEmailSettings(
  payload: Record<string, unknown>
): Promise<{ settings: AdminEmailSettings | null; message: string | null }> {
  const response = await api.put('/admin/email-settings', payload);
  const data = asRecord(response.data);

  return {
    settings: readEmailSettings(data),
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function testEmailSettings(): Promise<{
  result: ProviderTestResult;
  message: string | null;
}> {
  const response = await api.post('/admin/email-settings/test');
  const data = asRecord(response.data);

  return {
    result: readProviderTestResult(data),
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function getTwilioSettingsBundle(): Promise<TwilioSettingsBundle> {
  const response = await api.get('/admin/twilio-settings');
  return {
    settings: readTwilioSettings(response.data),
    credentials: readCredentials(response.data, { authToken: false }),
  };
}

export async function updateTwilioSettings(
  payload: Record<string, unknown>
): Promise<{ settings: AdminTwilioSettings | null; message: string | null }> {
  const response = await api.put('/admin/twilio-settings', payload);
  const data = asRecord(response.data);

  return {
    settings: readTwilioSettings(data),
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function testTwilioSettings(): Promise<{
  result: ProviderTestResult;
  message: string | null;
}> {
  const response = await api.post('/admin/twilio-settings/test');
  const data = asRecord(response.data);

  return {
    result: readProviderTestResult(data),
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function getRegistrationSettings(): Promise<RegistrationSettings | null> {
  const response = await api.get('/admin/registration-settings');
  return (asRecord(response.data) ?? null) as RegistrationSettings | null;
}

export async function updateRegistrationSettings(
  payload: Pick<RegistrationSettings, 'registrationMode' | 'defaultRole'>
): Promise<RegistrationSettings | null> {
  const response = await api.put('/admin/registration-settings', payload);
  return (asRecord(response.data) ?? null) as RegistrationSettings | null;
}

export async function listPendingRegistrations(
  status: 'pending' | 'approved' | 'rejected' = 'pending'
): Promise<PendingRegistrationList> {
  const response = await api.get(`/admin/pending-registrations?status=${status}`);
  return {
    items: readPendingRegistrations(response.data),
  };
}

export async function approvePendingRegistration(id: string): Promise<{
  result: Record<string, unknown> | null;
  message: string | null;
}> {
  const response = await api.post(`/admin/pending-registrations/${id}/approve`);
  const data = asRecord(response.data);
  return {
    result: asRecord(data?.result) ?? asRecord(data?.user) ?? null,
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function rejectPendingRegistration(
  id: string,
  reason?: string
): Promise<{ result: Record<string, unknown> | null; message: string | null }> {
  const response = await api.post(`/admin/pending-registrations/${id}/reject`, {
    reason,
  });
  const data = asRecord(response.data);
  return {
    result: asRecord(data?.result) ?? asRecord(data?.data) ?? null,
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function getAdminWorkspaceStatusCards(): Promise<AdminWorkspaceStatusCard[]> {
  const [
    organization,
    stats,
    emailBundle,
    twilioBundle,
    pending,
    mailchimpStatusResult,
    webhookEndpointsResult,
    apiKeysResult,
    portalRequestsResult,
    portalUsersResult,
    auditResult,
    outcomesResult,
  ] = await Promise.all([
    getOrganizationSettings().catch(() => null),
    getAdminStats().catch(() => null),
    getEmailSettingsBundle().catch(() => ({ settings: null, credentials: { smtp: false, imap: false } })),
    getTwilioSettingsBundle().catch(() => ({ settings: null, credentials: { authToken: false } })),
    listPendingRegistrations('pending').catch(() => ({ items: [] })),
    api.get('/mailchimp/status').then((response) => response.data as MailchimpStatus).catch(() => null),
    api.get('/webhooks/endpoints').then((response) => readArray(response.data, ['endpoints', 'data'])).catch(() => []),
    api.get('/webhooks/api-keys').then((response) => readArray(response.data, ['apiKeys', 'keys', 'data'])).catch(() => []),
    api.get('/portal/admin/requests').then((response) => readArray(response.data, ['requests', 'data'])).catch(() => []),
    api.get('/portal/admin/users').then((response) => readArray(response.data, ['users', 'data'])).catch(() => []),
    api.get('/admin/audit-logs?limit=1').then((response) => response.data as AuditSummary).catch(() => null),
    api.get('/admin/outcomes').then((response) => readArray(response.data, ['items', 'data'])).catch(() => []),
  ]);

  const organizationName = organization?.config.name?.trim() || 'Organization profile incomplete';
  const timezone = organization?.config.timezone || 'Timezone not set';
  const emailSettings = emailBundle.settings;
  const twilioSettings = twilioBundle.settings;
  const mailchimpStatus = mailchimpStatusResult as MailchimpStatus | null;
  const webhookEndpoints = webhookEndpointsResult as unknown[];
  const apiKeys = apiKeysResult as unknown[];
  const portalRequests = portalRequestsResult as unknown[];
  const portalUsers = portalUsersResult as unknown[];
  const auditSummary = auditResult as AuditSummary | null;
  const outcomes = outcomesResult as unknown[];

  return [
    {
      id: 'pending-approvals',
      title: 'Pending Approvals',
      description: 'Review new staff registration requests',
      summary:
        pending.items.length > 0
          ? `${pending.items.length} registration request${
              pending.items.length === 1 ? '' : 's'
            } awaiting review`
          : 'No pending registration requests',
      tone: pending.items.length > 0 ? 'warning' : 'neutral',
      icon: '⏳',
      to: getPath('admin-settings-approvals'),
    },
    {
      id: 'organization',
      title: 'Organization',
      description: 'Core identity and operating defaults',
      summary: `${organizationName} · ${timezone}`,
      tone: organization?.config.name ? 'positive' : 'warning',
      icon: '🏢',
      to: getPath('admin-settings-organization'),
    },
    {
      id: 'users',
      title: 'Users & Access',
      description: 'Account administration and approvals',
      summary: `${stats?.totalUsers ?? 0} users · invitations, groups, and roles`,
      tone: stats?.totalUsers ? 'positive' : 'neutral',
      icon: '👥',
      to: getPath('admin-settings-users'),
    },
    {
      id: 'email-delivery',
      title: 'Email Delivery',
      description: 'Transactional email readiness',
      summary: emailSettings?.isConfigured
        ? `Configured${emailSettings.smtpFromAddress ? ` · ${emailSettings.smtpFromAddress}` : ''}`
        : 'Not configured',
      tone: emailSettings?.isConfigured ? 'positive' : 'warning',
      icon: '✉️',
      to: getPath('admin-settings-communications'),
    },
    {
      id: 'sms',
      title: 'SMS & Messaging',
      description: 'Twilio and outbound messaging status',
      summary: twilioSettings?.isConfigured
        ? `Configured${twilioSettings.fromPhoneNumber ? ` · ${twilioSettings.fromPhoneNumber}` : ''}`
        : 'Not configured',
      tone: twilioSettings?.isConfigured ? 'positive' : 'warning',
      icon: '📱',
      to: getPath('admin-settings-messaging'),
    },
    {
      id: 'api',
      title: 'API & Webhooks',
      description: 'Integration access and delivery tooling',
      summary: `${webhookEndpoints.length} endpoints · ${apiKeys.length} API keys`,
      tone: webhookEndpoints.length > 0 || apiKeys.length > 0 ? 'positive' : 'neutral',
      icon: '🧩',
      to: getPath('api-settings'),
    },
    {
      id: 'campaigns',
      title: 'Newsletter Campaigns',
      description: 'Mailchimp sync and campaign operations',
      summary: mailchimpStatus?.configured
        ? `${mailchimpStatus.listCount ?? 0} audiences${mailchimpStatus.accountName ? ` · ${mailchimpStatus.accountName}` : ''}`
        : 'Provider not connected',
      tone: mailchimpStatus?.configured ? 'positive' : 'neutral',
      icon: '📣',
      to: getPath('communications'),
    },
    {
      id: 'portal',
      title: 'Portal Ops',
      description: 'Portal requests, users, and live operations',
      summary: `${portalRequests.length} pending requests · ${portalUsers.length} portal users`,
      tone: portalRequests.length > 0 ? 'warning' : 'neutral',
      icon: '🔐',
      to: getPath('portal-admin-access'),
    },
    {
      id: 'navigation',
      title: 'Navigation',
      description: 'Workspace menu and shortcut preferences',
      summary: 'Staff navigation preferences are available',
      tone: 'neutral',
      icon: '🧭',
      to: getPath('navigation-settings'),
    },
    {
      id: 'backup',
      title: 'Data Backup',
      description: 'On-demand export tooling',
      summary: 'Generate secure JSON backup exports on demand',
      tone: 'neutral',
      icon: '🗄️',
      to: getPath('backup-settings'),
    },
    {
      id: 'audit',
      title: 'Audit',
      description: 'Administrative activity visibility',
      summary: `${auditSummary?.total ?? 0} recorded events`,
      tone: auditSummary?.total ? 'positive' : 'neutral',
      icon: '📜',
      to: getPath('admin-settings-audit-logs'),
    },
    {
      id: 'outcomes',
      title: 'Outcomes',
      description: 'Reporting taxonomy and definitions',
      summary: `${outcomes.length} configured outcome definitions`,
      tone: outcomes.length > 0 ? 'positive' : 'neutral',
      icon: '📊',
      to: getPath('admin-settings-outcomes'),
    },
  ];
}
