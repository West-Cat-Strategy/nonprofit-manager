import type { Pool, PoolClient } from 'pg';
import type { Account, PaginatedAccounts } from '@app-types/account';
import { normalizeRoleSlug } from '@utils/roleSlug';

type DbClient = Pick<Pool | PoolClient, 'query'>;
type AccountRecordWithTaxId = { tax_id?: string | null };

export interface AccountFieldAccessContext {
  userId?: string;
  primaryRole?: string;
  roles?: string[];
}

export interface AccountTaxIdPolicy {
  canRead: boolean;
  canWrite: boolean;
  maskOnRead: boolean;
  maskType: string | null;
  source: 'field_access_rules' | 'admin_default' | 'closed_default';
}

interface AccountTaxIdPolicyRow {
  can_read: boolean;
  can_write: boolean;
  mask_on_read: boolean;
  mask_type: string | null;
}

export const CLOSED_ACCOUNT_TAX_ID_POLICY: AccountTaxIdPolicy = {
  canRead: false,
  canWrite: false,
  maskOnRead: false,
  maskType: null,
  source: 'closed_default',
};

export const ADMIN_ACCOUNT_TAX_ID_POLICY: AccountTaxIdPolicy = {
  canRead: true,
  canWrite: true,
  maskOnRead: false,
  maskType: null,
  source: 'admin_default',
};

const normalizeRoles = (context?: AccountFieldAccessContext): string[] => {
  const candidates = [
    ...(context?.roles ?? []),
    context?.primaryRole,
  ].filter((role): role is string => Boolean(role));

  return Array.from(
    new Set(
      candidates
        .map((role) => normalizeRoleSlug(role) ?? role.trim().toLowerCase())
        .filter(Boolean)
    )
  );
};

export const buildAccountFieldAccessContext = (
  input: AccountFieldAccessContext
): AccountFieldAccessContext => ({
  userId: input.userId,
  primaryRole: normalizeRoleSlug(input.primaryRole ?? '') ?? input.primaryRole,
  roles: normalizeRoles(input),
});

export const resolveAccountTaxIdPolicy = async (
  db: DbClient,
  context?: AccountFieldAccessContext
): Promise<AccountTaxIdPolicy> => {
  const roles = normalizeRoles(context);
  const userId = context?.userId?.trim() || null;

  if (roles.length === 0 && !userId) {
    return CLOSED_ACCOUNT_TAX_ID_POLICY;
  }

  try {
    const result = await db.query<AccountTaxIdPolicyRow>(
      `SELECT
         far.can_read,
         far.can_write,
         far.mask_on_read,
         far.mask_type
       FROM field_access_rules far
       INNER JOIN roles r ON r.id = far.role_id
       LEFT JOIN user_roles ur ON ur.role_id = r.id
       WHERE far.resource = 'accounts'
         AND far.field_name = 'tax_id'
         AND (
           r.name = ANY($1::text[])
           OR ($2::uuid IS NOT NULL AND ur.user_id = $2::uuid)
         )
       ORDER BY r.priority DESC, r.name ASC
       LIMIT 1`,
      [roles, userId]
    );

    const row = result.rows[0];
    if (row) {
      return {
        canRead: row.can_read === true,
        canWrite: row.can_write === true,
        maskOnRead: row.mask_on_read === true,
        maskType: row.mask_type,
        source: 'field_access_rules',
      };
    }
  } catch {
    // Closed fallback below prevents tax_id exposure when the policy lookup is unavailable.
  }

  return roles.includes('admin') ? ADMIN_ACCOUNT_TAX_ID_POLICY : CLOSED_ACCOUNT_TAX_ID_POLICY;
};

export const hasTaxIdWriteIntent = (payload: unknown): boolean =>
  Boolean(
    payload
      && typeof payload === 'object'
      && Object.prototype.hasOwnProperty.call(payload, 'tax_id')
      && (payload as { tax_id?: unknown }).tax_id !== undefined
  );

export const createTaxIdWriteDeniedError = (): Error & { statusCode: number; code: string } =>
  Object.assign(new Error('You do not have permission to write accounts.tax_id'), {
    statusCode: 403,
    code: 'forbidden',
  });

export const assertAccountTaxIdWriteAllowed = (
  payload: unknown,
  policy: AccountTaxIdPolicy
): void => {
  if (hasTaxIdWriteIntent(payload) && !policy.canWrite) {
    throw createTaxIdWriteDeniedError();
  }
};

const maskAccountTaxId = (value: string, maskType: string | null): string => {
  if (maskType === 'full') {
    return '*'.repeat(value.length);
  }

  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
};

export const applyAccountTaxIdReadPolicy = <T extends AccountRecordWithTaxId>(
  record: T,
  policy: AccountTaxIdPolicy
): Omit<T, 'tax_id'> & { tax_id?: string | null } => {
  if (!Object.prototype.hasOwnProperty.call(record, 'tax_id')) {
    return record;
  }

  if (!policy.canRead) {
    const rest = { ...record } as Omit<T, 'tax_id'> & { tax_id?: string | null };
    delete rest.tax_id;
    return rest;
  }

  if (policy.maskOnRead && record.tax_id !== null && record.tax_id !== undefined) {
    return {
      ...record,
      tax_id: maskAccountTaxId(String(record.tax_id), policy.maskType),
    };
  }

  return record;
};

export const applyAccountTaxIdReadPolicyToAccounts = (
  accounts: Account[],
  policy: AccountTaxIdPolicy
): Account[] =>
  accounts.map((account) => applyAccountTaxIdReadPolicy(account, policy) as unknown as Account);

export const applyAccountTaxIdReadPolicyToPaginatedAccounts = (
  result: PaginatedAccounts,
  policy: AccountTaxIdPolicy
): PaginatedAccounts => ({
  ...result,
  data: applyAccountTaxIdReadPolicyToAccounts(result.data, policy),
});

export const filterTaxIdColumnForRead = <T extends { key: string }>(
  columns: T[],
  policy: AccountTaxIdPolicy
): T[] => (policy.canRead ? columns : columns.filter((column) => column.key !== 'tax_id'));

export const filterTaxIdColumnForWrite = <T extends { key: string }>(
  columns: T[],
  policy: AccountTaxIdPolicy
): T[] => (policy.canWrite ? columns : columns.filter((column) => column.key !== 'tax_id'));
