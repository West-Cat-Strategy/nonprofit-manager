import { PolicyGroupError } from '../errors/policyGroupErrors';
import * as repo from '../repositories/policyGroupRepository';
import { normalizeRoleSlug } from '@utils/roleSlug';

export interface PolicyGroupItem {
  id: string;
  name: string;
  description: string | null;
  roles: string[];
  memberCount: number;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PolicyGroupInput {
  name?: string;
  description?: string | null;
  roles?: string[];
}

const mapPolicyGroupRow = (row: repo.PolicyGroupRow): PolicyGroupItem => ({
  id: row.id,
  name: row.name,
  description: row.description,
  roles: Array.isArray(row.roles) ? row.roles : [],
  memberCount: Number.parseInt(String(row.user_count ?? 0), 10) || 0,
  isSystem: Boolean(row.is_system),
  createdAt: row.created_at?.toISOString(),
  updatedAt: row.updated_at?.toISOString(),
});

const readRoleNames = (roles?: string[]): string[] =>
  Array.from(new Set((roles ?? []).map((role) => role.trim()).filter(Boolean)));

const requirePolicyGroupsAvailable = async (): Promise<void> => {
  if (!(await repo.hasPolicyGroupTables())) {
    throw new PolicyGroupError(
      'INVALID_INPUT',
      'Policy groups are not available until the latest database migrations are applied'
    );
  }
};

const resolveRoleIds = async (
  roleNames: string[],
  db: Parameters<typeof repo.replacePolicyGroupRoles>[3]
): Promise<string[]> => {
  const resolved = await repo.loadRoleIdsByNames(roleNames, db);
  const resolvedNames = new Set(
    resolved.map((row) => normalizeRoleSlug(row.name) ?? row.name)
  );
  const missing = roleNames.filter(
    (name) => !resolvedNames.has(normalizeRoleSlug(name) ?? name)
  );

  if (missing.length > 0) {
    throw new PolicyGroupError('UNKNOWN_ROLE', `Unknown roles: ${missing.join(', ')}`);
  }

  return resolved.map((row) => row.id);
};

export const listPolicyGroups = async (): Promise<PolicyGroupItem[]> => {
  if (!(await repo.hasPolicyGroupTables())) {
    return [];
  }

  const rows = await repo.getPolicyGroupCatalogRows();
  return rows.map(mapPolicyGroupRow);
};

export const createPolicyGroup = async (
  input: Required<Pick<PolicyGroupInput, 'name'>> & PolicyGroupInput,
  createdBy?: string
): Promise<PolicyGroupItem> => {
  await requirePolicyGroupsAvailable();

  const name = input.name.trim();
  if (!name) {
    throw new PolicyGroupError('INVALID_INPUT', 'Group name is required');
  }

  const description =
    input.description === undefined ? null : input.description?.trim() || null;
  const roleNames = readRoleNames(input.roles);

  const createdGroupId = await repo.withTransaction(async (db) => {
    const conflict = await repo.findPolicyGroupByName(name, undefined, db);
    if (conflict) {
      throw new PolicyGroupError('CONFLICT', 'A group with this name already exists');
    }

    const roleIds = await resolveRoleIds(roleNames, db);
    const groupId = await repo.insertPolicyGroup(
      {
        name,
        description,
        createdBy: createdBy ?? null,
      },
      db
    );

    await repo.replacePolicyGroupRoles(groupId, roleIds, createdBy ?? null, db);
    return groupId;
  });

  const created = await repo.getPolicyGroupRowById(createdGroupId);
  if (!created) {
    throw new Error('Failed to load created group');
  }

  return mapPolicyGroupRow(created);
};

export const updatePolicyGroup = async (
  id: string,
  input: PolicyGroupInput,
  modifiedBy?: string
): Promise<PolicyGroupItem> => {
  await requirePolicyGroupsAvailable();

  await repo.withTransaction(async (db) => {
    const existing = await repo.getPolicyGroupRowById(id, db);
    if (!existing) {
      throw new PolicyGroupError('NOT_FOUND', 'Group not found');
    }

    if (existing.is_system && input.name && input.name.trim() !== existing.name) {
      throw new PolicyGroupError('RESERVED', 'System groups cannot be renamed');
    }

    if (input.name) {
      const conflict = await repo.findPolicyGroupByName(input.name, id, db);
      if (conflict) {
        throw new PolicyGroupError('CONFLICT', 'A group with this name already exists');
      }
    }

    const roleNames = input.roles ? readRoleNames(input.roles) : null;
    if (roleNames) {
      const roleIds = await resolveRoleIds(roleNames, db);
      await repo.replacePolicyGroupRoles(id, roleIds, modifiedBy ?? null, db);
    }

    if (input.name !== undefined || input.description !== undefined) {
      await repo.updatePolicyGroup(
        {
          id,
          name: input.name?.trim(),
          description: input.description === undefined ? undefined : input.description,
          modifiedBy: modifiedBy ?? null,
        },
        db
      );
    }
  });

  const updated = await repo.getPolicyGroupRowById(id);
  if (!updated) {
    throw new Error('Failed to load updated group');
  }

  return mapPolicyGroupRow(updated);
};

export const deletePolicyGroup = async (id: string): Promise<void> => {
  await requirePolicyGroupsAvailable();

  await repo.withTransaction(async (db) => {
    const existing = await repo.getPolicyGroupRowById(id, db);
    if (!existing) {
      throw new PolicyGroupError('NOT_FOUND', 'Group not found');
    }

    if (existing.is_system) {
      throw new PolicyGroupError('RESERVED', 'System groups cannot be deleted');
    }

    await repo.deletePolicyGroup(id, db);
  });
};
