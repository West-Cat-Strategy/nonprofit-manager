import type {
  AdminGroup,
  OrganizationAccount,
  UserAccessInfo,
  UserSecurityInfo,
} from '../types';

export type AccessDraft = {
  groups: string[];
  organizationAccess: string[];
};

export type GroupEditorState = AdminGroup | null;

export type ConfirmedUserDetails = {
  user: UserSecurityInfo;
  access: UserAccessInfo;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export const readList = <T,>(value: unknown, keys: string[] = []): T[] => {
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

export const readAccessInfo = (value: unknown): UserAccessInfo => {
  const record = asRecord(value);

  return {
    groups: readList<string>(value, ['groups', 'groupIds', 'roleGroups']),
    organizationAccess: readList<string>(value, [
      'organizationAccess',
      'organizationAccountIds',
      'accounts',
      'organizationAccounts',
    ]),
    mfaTotpEnabled: Boolean(record?.mfaTotpEnabled ?? record?.totpEnabled ?? false),
    passkeyCount: Number(record?.passkeyCount ?? record?.passkeysCount ?? 0),
  };
};

export const readUserSecurityInfo = (
  userValue: unknown,
  accessValue: UserAccessInfo
): UserSecurityInfo => {
  const record = asRecord(userValue);
  return {
    id: String(record?.id ?? ''),
    email: String(record?.email ?? ''),
    firstName: String(record?.firstName ?? ''),
    lastName: String(record?.lastName ?? ''),
    role: String(record?.role ?? ''),
    profilePicture: (record?.profilePicture as string | null | undefined) ?? null,
    isActive: Boolean(record?.isActive ?? true),
    lastLoginAt: (record?.lastLoginAt as string | null | undefined) ?? null,
    lastPasswordChange: (record?.lastPasswordChange as string | null | undefined) ?? null,
    failedLoginAttempts: Number(record?.failedLoginAttempts ?? 0),
    isLocked: Boolean(record?.isLocked ?? false),
    createdAt: String(record?.createdAt ?? new Date().toISOString()),
    updatedAt: String(record?.updatedAt ?? new Date().toISOString()),
    groups: accessValue.groups,
    organizationAccess: accessValue.organizationAccess,
    mfaTotpEnabled: accessValue.mfaTotpEnabled,
    passkeyCount: accessValue.passkeyCount,
  };
};

export const readGroups = (value: unknown): AdminGroup[] =>
  readList<AdminGroup>(value, ['groups', 'items', 'data']).map((group) => ({
    id: String(group.id ?? ''),
    name: String(group.name ?? ''),
    description: (group.description as string | null | undefined) ?? null,
    roles: Array.isArray(group.roles)
      ? (group.roles as string[])
      : Array.isArray((group as Record<string, unknown>).roleNames)
        ? ((group as Record<string, unknown>).roleNames as string[])
        : [],
    memberCount: Number(group.memberCount ?? 0),
    isSystem: Boolean(group.isSystem ?? false),
    createdAt: (group.createdAt as string | undefined) ?? undefined,
    updatedAt: (group.updatedAt as string | undefined) ?? undefined,
  }));

export const readOrganizationAccounts = (value: unknown): OrganizationAccount[] =>
  readList<OrganizationAccount>(value, ['organizationAccounts', 'accounts', 'items', 'data']).map(
    (account) => ({
      id: String(account.id ?? ''),
      name: String(account.name ?? account.label ?? ''),
      label: (account.label as string | undefined) ?? undefined,
      description: (account.description as string | null | undefined) ?? null,
      isDefault: Boolean(account.isDefault ?? false),
      isActive: Boolean(account.isActive ?? true),
    })
  );
