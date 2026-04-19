import { setCurrentUserId } from '@config/database';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { PoolClient } from 'pg';
import type { QueryValue } from './shared';

export const getScopedAccountIds = (scope?: DataScopeFilter): string[] | undefined => {
  if (!scope?.accountIds || scope.accountIds.length === 0) {
    return undefined;
  }

  return scope.accountIds;
};

export const appendAccountScopeCondition = (
  conditions: string[],
  params: QueryValue[],
  scope: DataScopeFilter | undefined,
  column: string
): void => {
  const accountIds = getScopedAccountIds(scope);
  if (!accountIds) {
    return;
  }

  conditions.push(`${column} = ANY($${params.length + 1}::uuid[])`);
  params.push(accountIds);
};

export const setTransactionUserContext = async (
  client: Pick<PoolClient, 'query'>,
  userId?: string | null
): Promise<void> => {
  if (!userId) {
    return;
  }

  await setCurrentUserId(client, userId, { local: true });
};
