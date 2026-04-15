import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { normalizeRoleSlug } from '@utils/roleSlug';

type DbClient = Pool | PoolClient;

export interface PolicyGroupRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  user_count: string | number;
  roles: string[] | null;
  created_at?: Date;
  updated_at?: Date;
}

const mapRoleName = (value: string): string => normalizeRoleSlug(value) ?? value;

export const hasPolicyGroupTables = async (db: DbClient = pool): Promise<boolean> => {
  const result = await db.query<{
    policy_groups_table: string | null;
    policy_group_roles_table: string | null;
    user_policy_groups_table: string | null;
  }>(
    `SELECT
       to_regclass('public.policy_groups') as policy_groups_table,
       to_regclass('public.policy_group_roles') as policy_group_roles_table,
       to_regclass('public.user_policy_groups') as user_policy_groups_table`
  );

  const row = result.rows[0];
  return Boolean(row?.policy_groups_table && row?.policy_group_roles_table && row?.user_policy_groups_table);
};

export const withTransaction = async <T>(
  handler: (db: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.warn('Failed to roll back policy group transaction', {
        rollbackError:
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      });
    }
    throw error;
  } finally {
    client.release();
  }
};

export const getPolicyGroupCatalogRows = async (
  db: DbClient = pool
): Promise<PolicyGroupRow[]> => {
  const result = await db.query<PolicyGroupRow>(
    `SELECT
       pg.id,
       pg.name,
       pg.description,
       pg.is_system,
       pg.created_at,
       pg.updated_at,
       COUNT(DISTINCT upg.user_id)::text AS user_count,
       COALESCE(
         ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
         '{}'::text[]
       ) AS roles
     FROM policy_groups pg
     LEFT JOIN user_policy_groups upg ON upg.policy_group_id = pg.id
     LEFT JOIN policy_group_roles pgr ON pgr.policy_group_id = pg.id
     LEFT JOIN roles r ON r.id = pgr.role_id
     GROUP BY pg.id
     ORDER BY pg.is_system DESC, pg.name ASC`
  );

  return result.rows.map((row) => ({
    ...row,
    roles: Array.isArray(row.roles) ? row.roles.map(mapRoleName) : [],
  }));
};

export const getPolicyGroupRowById = async (
  id: string,
  db: DbClient = pool
): Promise<PolicyGroupRow | null> => {
  const result = await db.query<PolicyGroupRow>(
    `SELECT
       pg.id,
       pg.name,
       pg.description,
       pg.is_system,
       pg.created_at,
       pg.updated_at,
       COUNT(DISTINCT upg.user_id)::text AS user_count,
       COALESCE(
         ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
         '{}'::text[]
       ) AS roles
     FROM policy_groups pg
     LEFT JOIN user_policy_groups upg ON upg.policy_group_id = pg.id
     LEFT JOIN policy_group_roles pgr ON pgr.policy_group_id = pg.id
     LEFT JOIN roles r ON r.id = pgr.role_id
     WHERE pg.id = $1
     GROUP BY pg.id`,
    [id]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    roles: Array.isArray(row.roles) ? row.roles.map(mapRoleName) : [],
  };
};

export const findPolicyGroupByName = async (
  name: string,
  excludeId?: string,
  db: DbClient = pool
): Promise<{ id: string; name: string; is_system: boolean } | null> => {
  const params: unknown[] = [name.trim().toLowerCase()];
  let exclusionClause = '';
  if (excludeId) {
    params.push(excludeId);
    exclusionClause = 'AND id <> $2';
  }

  const result = await db.query<{ id: string; name: string; is_system: boolean }>(
    `SELECT id, name, is_system
     FROM policy_groups
     WHERE LOWER(name) = $1
       ${exclusionClause}
     LIMIT 1`,
    params
  );

  return result.rows[0] ?? null;
};

export const getPolicyGroupsByIds = async (
  ids: string[],
  db: DbClient = pool
): Promise<PolicyGroupRow[]> => {
  if (ids.length === 0) {
    return [];
  }

  const result = await db.query<PolicyGroupRow>(
    `SELECT
       pg.id,
       pg.name,
       pg.description,
       pg.is_system,
       pg.created_at,
       pg.updated_at,
       COUNT(DISTINCT upg.user_id)::text AS user_count,
       COALESCE(
         ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
         '{}'::text[]
       ) AS roles
     FROM policy_groups pg
     LEFT JOIN user_policy_groups upg ON upg.policy_group_id = pg.id
     LEFT JOIN policy_group_roles pgr ON pgr.policy_group_id = pg.id
     LEFT JOIN roles r ON r.id = pgr.role_id
     WHERE pg.id = ANY($1::uuid[])
     GROUP BY pg.id`,
    [ids]
  );

  return result.rows.map((row) => ({
    ...row,
    roles: Array.isArray(row.roles) ? row.roles.map(mapRoleName) : [],
  }));
};

export const insertPolicyGroup = async (
  input: {
    name: string;
    description?: string | null;
    createdBy?: string | null;
  },
  db: DbClient = pool
): Promise<string> => {
  const result = await db.query<{ id: string }>(
    `INSERT INTO policy_groups (name, description, created_by, modified_by)
     VALUES ($1, $2, $3, $3)
     RETURNING id`,
    [input.name.trim(), input.description?.trim() || null, input.createdBy ?? null]
  );

  return result.rows[0].id;
};

export const updatePolicyGroup = async (
  input: {
    id: string;
    name?: string;
    description?: string | null;
    modifiedBy?: string | null;
  },
  db: DbClient = pool
): Promise<void> => {
  await db.query(
    `UPDATE policy_groups
     SET name = COALESCE($1, name),
         description = CASE
           WHEN $2::boolean IS TRUE THEN $3
           ELSE description
         END,
         updated_at = NOW(),
         modified_by = $4
     WHERE id = $5`,
    [
      input.name?.trim(),
      input.description !== undefined,
      input.description?.trim() || null,
      input.modifiedBy ?? null,
      input.id,
    ]
  );
};

export const deletePolicyGroup = async (
  id: string,
  db: DbClient = pool
): Promise<void> => {
  await db.query('DELETE FROM policy_groups WHERE id = $1', [id]);
};

export const loadRoleIdsByNames = async (
  roleNames: string[],
  db: DbClient = pool
): Promise<Array<{ id: string; name: string }>> => {
  if (roleNames.length === 0) {
    return [];
  }

  const normalizedNames = Array.from(
    new Set(roleNames.map((name) => normalizeRoleSlug(name) ?? name).filter(Boolean))
  );
  const result = await db.query<{ id: string; name: string }>(
    'SELECT id, name FROM roles ORDER BY priority DESC, name ASC'
  );

  return result.rows.filter((row) =>
    normalizedNames.includes(normalizeRoleSlug(row.name) ?? row.name)
  );
};

export const replacePolicyGroupRoles = async (
  policyGroupId: string,
  roleIds: string[],
  createdBy?: string | null,
  db: DbClient = pool
): Promise<void> => {
  await db.query('DELETE FROM policy_group_roles WHERE policy_group_id = $1', [policyGroupId]);

  for (const roleId of roleIds) {
    await db.query(
      `INSERT INTO policy_group_roles (policy_group_id, role_id, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [policyGroupId, roleId, createdBy ?? null]
    );
  }
};

export const getPolicyGroupsForUser = async (
  userId: string,
  db: DbClient = pool
): Promise<PolicyGroupRow[]> => {
  const result = await db.query<PolicyGroupRow>(
    `SELECT
       pg.id,
       pg.name,
       pg.description,
       pg.is_system,
       COUNT(DISTINCT upg2.user_id)::text AS user_count,
       COALESCE(
         ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
         '{}'::text[]
       ) AS roles
     FROM user_policy_groups upg
     INNER JOIN policy_groups pg ON pg.id = upg.policy_group_id
     LEFT JOIN user_policy_groups upg2 ON upg2.policy_group_id = pg.id
     LEFT JOIN policy_group_roles pgr ON pgr.policy_group_id = pg.id
     LEFT JOIN roles r ON r.id = pgr.role_id
     WHERE upg.user_id = $1
     GROUP BY pg.id
     ORDER BY pg.name ASC`,
    [userId]
  );

  return result.rows.map((row) => ({
    ...row,
    roles: Array.isArray(row.roles) ? row.roles.map(mapRoleName) : [],
  }));
};

export const replaceUserPolicyGroups = async (
  userId: string,
  policyGroupIds: string[],
  assignedBy?: string | null,
  db: DbClient = pool
): Promise<void> => {
  await db.query('DELETE FROM user_policy_groups WHERE user_id = $1', [userId]);

  for (const policyGroupId of policyGroupIds) {
    await db.query(
      `INSERT INTO user_policy_groups (user_id, policy_group_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, policyGroupId, assignedBy ?? null]
    );
  }
};
