import type { Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';

export type ScopedAccountLookupRow = {
  account_id: string;
  account_number: string | null;
};

export const lookupScopedAccounts = async (
  pool: Pick<Pool, 'query'>,
  accountIds: string[],
  accountNumbers: string[],
  organizationId: string,
  scope?: DataScopeFilter
): Promise<ScopedAccountLookupRow[]> => {
  if (accountIds.length === 0 && accountNumbers.length === 0) {
    return [];
  }

  const conditions: string[] = [];
  const identityConditions: string[] = [];
  const values: Array<string | string[]> = [];
  let parameter = 1;

  if (accountIds.length) {
    identityConditions.push(`a.id = ANY($${parameter}::uuid[])`);
    values.push(accountIds);
    parameter += 1;
  }

  if (accountNumbers.length) {
    identityConditions.push(`a.account_number = ANY($${parameter}::text[])`);
    values.push(accountNumbers);
    parameter += 1;
  }

  conditions.push(`(${identityConditions.join(' OR ')})`, `a.id = $${parameter}`);
  values.push(organizationId);
  parameter += 1;

  if (scope?.accountIds?.length) {
    conditions.push(`a.id = ANY($${parameter}::uuid[])`);
    values.push(scope.accountIds);
    parameter += 1;
  }

  if (scope?.createdByUserIds?.length) {
    conditions.push(`a.created_by = ANY($${parameter}::uuid[])`);
    values.push(scope.createdByUserIds);
    parameter += 1;
  }

  if (scope?.accountTypes?.length) {
    conditions.push(`a.account_type = ANY($${parameter}::text[])`);
    values.push(scope.accountTypes);
  }

  const result = await pool.query<ScopedAccountLookupRow>(
    `
      SELECT a.id AS account_id, a.account_number
      FROM accounts a
      WHERE ${conditions.join(' AND ')}
    `,
    values
  );

  return result.rows;
};
