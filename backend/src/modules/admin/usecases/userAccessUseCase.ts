import pool, { withUserContextTransaction } from '@config/database';
import {
  getUserAccessOverview,
  listOrganizationAccounts,
  replaceUserOrganizationAccess,
} from '@services/accountAccessService';
import * as policyGroupRepository from '../repositories/policyGroupRepository';
import type { PoolClient } from 'pg';

export interface UpdateUserAccessInput {
  groups: string[];
  organizationAccess: string[];
}

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const getUserRoleById = async (
  userId: string,
  db: PoolClient | typeof pool = pool
): Promise<{ id: string; role: string } | null> => {
  const result = await db.query<{ id: string; role: string }>(
    'SELECT id, role FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] ?? null;
};

export const getUserAccess = async (userId: string) => {
  const user = await getUserRoleById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return getUserAccessOverview(userId);
};

export const updateUserAccess = async (
  userId: string,
  input: UpdateUserAccessInput,
  modifiedBy?: string
) => {
  const actorId = modifiedBy?.trim();
  if (!actorId) {
    throw Object.assign(new Error('Authenticated actor is required to update user access'), {
      statusCode: 401,
      code: 'unauthorized',
    });
  }

  const groups = unique(input.groups);
  const organizationAccess = unique(input.organizationAccess);

  await withUserContextTransaction(actorId, async (db) => {
    const user = await getUserRoleById(userId, db);
    if (!user) {
      throw new Error('User not found');
    }

    if (await policyGroupRepository.hasPolicyGroupTables(db)) {
      const existingGroups = await policyGroupRepository.getPolicyGroupsByIds(groups, db);
      const existingIds = new Set(existingGroups.map((group) => group.id));
      const missingGroups = groups.filter((groupId) => !existingIds.has(groupId));
      if (missingGroups.length > 0) {
        throw new Error(`Unknown groups: ${missingGroups.join(', ')}`);
      }

      await policyGroupRepository.replaceUserPolicyGroups(userId, groups, actorId, db);
    } else if (groups.length > 0) {
      throw new Error('Policy groups are unavailable until the latest database migrations are applied');
    }

    await replaceUserOrganizationAccess(
      {
        userId,
        role: user.role,
        organizationAccountIds: organizationAccess,
        grantedBy: actorId,
      },
      db
    );
  });

  return getUserAccessOverview(userId);
};

export const getOrganizationAccounts = async () => listOrganizationAccounts();
