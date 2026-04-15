import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { normalizeRoleSlug } from '@utils/roleSlug';

type DbClient = Pool | PoolClient;

export type OrganizationAccessLevel = 'admin' | 'editor' | 'viewer';

export interface OrganizationAccountRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export interface UserAccessOverview {
  groups: string[];
  organizationAccess: string[];
  mfaTotpEnabled: boolean;
  passkeyCount: number;
}

const DEFAULT_ACCESS_LEVEL_BY_ROLE: Record<string, OrganizationAccessLevel> = {
  admin: 'admin',
  manager: 'editor',
  staff: 'editor',
  viewer: 'viewer',
  volunteer: 'viewer',
};

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const hasAccountsTable = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ accounts_table: string | null }>(
    `SELECT to_regclass('public.accounts') AS accounts_table`
  );
  return Boolean(result?.rows?.[0]?.accounts_table);
};

const hasUserAccountAccessTable = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ access_table: string | null }>(
    `SELECT to_regclass('public.user_account_access') AS access_table`
  );
  return Boolean(result?.rows?.[0]?.access_table);
};

const hasPolicyGroupTables = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ table_name: string | null }>(
    `SELECT to_regclass('public.user_policy_groups') AS table_name`
  );
  return Boolean(result?.rows?.[0]?.table_name);
};

const hasPasskeyTable = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ table_name: string | null }>(
    `SELECT to_regclass('public.user_webauthn_credentials') AS table_name`
  );
  return Boolean(result?.rows?.[0]?.table_name);
};

const hasTotpColumn = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'mfa_totp_enabled'
     ) AS exists`
  );
  return result?.rows?.[0]?.exists === true;
};

const getDefaultOrganizationAccountId = async (db: DbClient): Promise<string | null> => {
  if (!(await hasAccountsTable(db))) {
    return null;
  }

  const result = await db.query<{ id: string }>(
    `SELECT id
     FROM accounts
     WHERE account_type = 'organization'
       AND COALESCE(is_active, true) = true
     ORDER BY created_at ASC, account_name ASC
     LIMIT 1`
  );
  return result?.rows?.[0]?.id ?? null;
};

export const resolveDefaultOrganizationAccessLevel = (
  role: string
): OrganizationAccessLevel => {
  const normalizedRole = normalizeRoleSlug(role) ?? role;
  return DEFAULT_ACCESS_LEVEL_BY_ROLE[normalizedRole] ?? 'viewer';
};

export const listOrganizationAccounts = async (
  db: DbClient = pool
): Promise<OrganizationAccountRecord[]> => {
  if (!(await hasAccountsTable(db))) {
    return [];
  }

  const defaultAccountId = await getDefaultOrganizationAccountId(db);
  const result = await db.query<{
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  }>(
    `SELECT
       id,
       account_name AS name,
       description,
       COALESCE(is_active, true) AS is_active
     FROM accounts
     WHERE account_type = 'organization'
     ORDER BY created_at ASC, account_name ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    isDefault: row.id === defaultAccountId,
  }));
};

export const upsertUserOrganizationAccess = async (
  input: {
    userId: string;
    accountId: string;
    accessLevel: OrganizationAccessLevel;
    grantedBy?: string | null;
  },
  db: DbClient = pool
): Promise<void> => {
  if (!(await hasUserAccountAccessTable(db))) {
    return;
  }

  await db.query(
    `INSERT INTO user_account_access (user_id, account_id, access_level, granted_by, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (user_id, account_id)
     DO UPDATE SET access_level = EXCLUDED.access_level,
                   granted_by = EXCLUDED.granted_by,
                   is_active = true,
                   granted_at = CURRENT_TIMESTAMP`,
    [input.userId, input.accountId, input.accessLevel, input.grantedBy ?? null]
  );
};

export const seedDefaultOrganizationAccess = async (
  input: {
    userId: string;
    role: string;
    grantedBy?: string | null;
  },
  db: DbClient = pool
): Promise<string | null> => {
  if (!(await hasAccountsTable(db)) || !(await hasUserAccountAccessTable(db))) {
    return null;
  }

  const defaultAccountId = await getDefaultOrganizationAccountId(db);
  if (!defaultAccountId) {
    return null;
  }

  await upsertUserOrganizationAccess(
    {
      userId: input.userId,
      accountId: defaultAccountId,
      accessLevel: resolveDefaultOrganizationAccessLevel(input.role),
      grantedBy: input.grantedBy ?? null,
    },
    db
  );

  return defaultAccountId;
};

export const replaceUserOrganizationAccess = async (
  input: {
    userId: string;
    role: string;
    organizationAccountIds: string[];
    grantedBy?: string | null;
  },
  db: DbClient = pool
): Promise<string[]> => {
  if (!(await hasUserAccountAccessTable(db)) || !(await hasAccountsTable(db))) {
    return [];
  }

  const accountIds = unique(input.organizationAccountIds);
  if (accountIds.length === 0) {
    await db.query('DELETE FROM user_account_access WHERE user_id = $1', [input.userId]);
    return [];
  }

  const validAccounts = await db.query<{ id: string }>(
    `SELECT id
     FROM accounts
     WHERE account_type = 'organization'
       AND id = ANY($1::uuid[])`,
    [accountIds]
  );
  const validIds = validAccounts.rows.map((row) => row.id);
  const missingIds = accountIds.filter((id) => !validIds.includes(id));
  if (missingIds.length > 0) {
    throw new Error(`Unknown organization accounts: ${missingIds.join(', ')}`);
  }

  await db.query(
    `DELETE FROM user_account_access
     WHERE user_id = $1
       AND account_id <> ALL($2::uuid[])`,
    [input.userId, validIds]
  );

  const accessLevel = resolveDefaultOrganizationAccessLevel(input.role);
  for (const accountId of validIds) {
    await upsertUserOrganizationAccess(
      {
        userId: input.userId,
        accountId,
        accessLevel,
        grantedBy: input.grantedBy ?? null,
      },
      db
    );
  }

  return validIds;
};

export const getUsersAccessOverview = async (
  userIds: string[],
  db: DbClient = pool
): Promise<Record<string, UserAccessOverview>> => {
  const normalizedUserIds = unique(userIds);
  if (normalizedUserIds.length === 0) {
    return {};
  }

  const overview = Object.fromEntries(
    normalizedUserIds.map((userId) => [
      userId,
      {
        groups: [],
        organizationAccess: [],
        mfaTotpEnabled: false,
        passkeyCount: 0,
      } satisfies UserAccessOverview,
    ])
  ) as Record<string, UserAccessOverview>;

  if (await hasPolicyGroupTables(db)) {
    const groupResult = await db.query<{ user_id: string; policy_group_id: string }>(
      `SELECT user_id, policy_group_id::text
       FROM user_policy_groups
       WHERE user_id = ANY($1::uuid[])
       ORDER BY user_id ASC, policy_group_id ASC`,
      [normalizedUserIds]
    );

    for (const row of groupResult.rows) {
      overview[row.user_id]?.groups.push(row.policy_group_id);
    }
  }

  if ((await hasUserAccountAccessTable(db)) && (await hasAccountsTable(db))) {
    const accountResult = await db.query<{ user_id: string; account_id: string }>(
      `SELECT uaa.user_id, uaa.account_id::text
       FROM user_account_access uaa
       INNER JOIN accounts a ON a.id = uaa.account_id
       WHERE uaa.user_id = ANY($1::uuid[])
         AND uaa.is_active = true
         AND a.account_type = 'organization'
       ORDER BY uaa.user_id ASC, uaa.account_id ASC`,
      [normalizedUserIds]
    );

    for (const row of accountResult.rows) {
      overview[row.user_id]?.organizationAccess.push(row.account_id);
    }
  }

  if (await hasTotpColumn(db)) {
    const totpResult = await db.query<{ id: string; mfa_totp_enabled: boolean }>(
      `SELECT id, COALESCE(mfa_totp_enabled, false) AS mfa_totp_enabled
       FROM users
       WHERE id = ANY($1::uuid[])`,
      [normalizedUserIds]
    );

    for (const row of totpResult.rows) {
      if (overview[row.id]) {
        overview[row.id].mfaTotpEnabled = row.mfa_totp_enabled;
      }
    }
  }

  if (await hasPasskeyTable(db)) {
    const passkeyResult = await db.query<{ user_id: string; passkey_count: string }>(
      `SELECT user_id, COUNT(*)::text AS passkey_count
       FROM user_webauthn_credentials
       WHERE user_id = ANY($1::uuid[])
       GROUP BY user_id`,
      [normalizedUserIds]
    );

    for (const row of passkeyResult.rows) {
      if (overview[row.user_id]) {
        overview[row.user_id].passkeyCount = Number.parseInt(row.passkey_count, 10) || 0;
      }
    }
  }

  for (const item of Object.values(overview)) {
    item.groups = unique(item.groups);
    item.organizationAccess = unique(item.organizationAccess);
  }

  return overview;
};

export const getUserAccessOverview = async (
  userId: string,
  db: DbClient = pool
): Promise<UserAccessOverview> => {
  const result = await getUsersAccessOverview([userId], db);
  return (
    result[userId] ?? {
      groups: [],
      organizationAccess: [],
      mfaTotpEnabled: false,
      passkeyCount: 0,
    }
  );
};
