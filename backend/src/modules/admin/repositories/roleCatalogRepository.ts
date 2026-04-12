import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { normalizeRoleSlug } from '@utils/roleSlug';

function getCanonicalRoleName(value: string): string {
  return normalizeRoleSlug(value) ?? value;
}

export const hasRoleTables = async (db: Pool | PoolClient = pool): Promise<boolean> => {
  const result = await db.query<{
    roles_table: string | null;
    permissions_table: string | null;
    role_permissions_table: string | null;
    user_roles_table: string | null;
  }>(
    `SELECT
       to_regclass('public.roles') as roles_table,
       to_regclass('public.permissions') as permissions_table,
       to_regclass('public.role_permissions') as role_permissions_table,
       to_regclass('public.user_roles') as user_roles_table`
  );

  const row = result.rows[0];
  return Boolean(row?.roles_table && row?.permissions_table && row?.role_permissions_table && row?.user_roles_table);
};

export const hasPermissionTable = async (db: Pool | PoolClient = pool): Promise<boolean> => {
  const result = await db.query<{ permissions_table: string | null }>(
    `SELECT to_regclass('public.permissions') as permissions_table`
  );

  return Boolean(result.rows[0]?.permissions_table);
};

export const findRoleRowByNormalizedName = async (
  db: Pool | PoolClient,
  normalizedName: string,
  excludeRoleId?: string
): Promise<{ id: string; name: string } | null> => {
  const params: unknown[] = [];
  let whereClause = '';
  if (excludeRoleId) {
    params.push(excludeRoleId);
    whereClause = 'WHERE id <> $1';
  }

  const result = await db.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM roles
     ${whereClause}
     ORDER BY is_system DESC, priority DESC, name ASC`,
    params
  );

  return result.rows.find((row) => getCanonicalRoleName(row.name) === normalizedName) ?? null;
};

export const loadPermissionIds = async (
  db: Pool | PoolClient,
  permissionNames: string[]
): Promise<{ id: string; name: string }[]> => {
  if (permissionNames.length === 0) {
    return [];
  }

  const result = await db.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM permissions
     WHERE name = ANY($1::text[])`,
    [permissionNames]
  );

  return result.rows;
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
      logger.warn('Failed to roll back role catalog transaction', {
        rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
      });
    }
    throw error;
  } finally {
    client.release();
  }
};

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  priority: number | string;
  user_count: string | number;
  permissions: string[] | null;
}

export const getRoleCatalogRows = async (): Promise<RoleRow[]> => {
  const result = await pool.query<RoleRow>(
    `SELECT
       r.id,
       r.name,
       r.description,
       r.is_system,
       r.priority,
       COUNT(DISTINCT ur.user_id)::text AS user_count,
       COALESCE(
         ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
         '{}'::text[]
       ) AS permissions
     FROM roles r
     LEFT JOIN user_roles ur ON ur.role_id = r.id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id
     ORDER BY r.is_system DESC, r.priority DESC, r.name ASC`
  );
  return result.rows;
};

export const getRoleRowById = async (
  id: string,
  db: Pool | PoolClient = pool
): Promise<RoleRow | null> => {
  const result = await db.query<RoleRow>(
    `SELECT
       r.id,
       r.name,
       r.description,
       r.is_system,
       r.priority,
       COUNT(DISTINCT ur.user_id)::text AS user_count,
       COALESCE(
         ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
         '{}'::text[]
       ) AS permissions
     FROM roles r
     LEFT JOIN user_roles ur ON ur.role_id = r.id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE r.id = $1
     GROUP BY r.id`,
    [id]
  );
  return result.rows[0] ?? null;
};

export interface PermissionRow {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

export const getPermissionCatalogRows = async (): Promise<PermissionRow[]> => {
  const result = await pool.query<PermissionRow>(
    `SELECT id, name, description, resource, action
     FROM permissions
     ORDER BY resource ASC, action ASC, name ASC`
  );
  return result.rows;
};

export const insertRole = async (
  db: Pool | PoolClient,
  normalizedName: string,
  description: string | null
): Promise<string> => {
  const inserted = await db.query<{ id: string }>(
    `INSERT INTO roles (name, description, is_system, priority)
     VALUES ($1, $2, false, 0)
     RETURNING id`,
    [normalizedName, description]
  );
  const roleId = inserted.rows[0]?.id;
  if (!roleId) throw new Error('Failed to create role');
  return roleId;
};

export const insertRolePermissions = async (
  db: Pool | PoolClient,
  roleId: string,
  permissionIds: string[]
): Promise<void> => {
  for (const permissionId of permissionIds) {
    await db.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [roleId, permissionId]
    );
  }
};

export const deleteRolePermissions = async (
  db: Pool | PoolClient,
  roleId: string
): Promise<void> => {
  await db.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
};

export const getBaseRoleById = async (
  db: Pool | PoolClient,
  roleId: string
): Promise<{ id: string; name: string; is_system: boolean } | null> => {
  const existing = await db.query<{ id: string; name: string; is_system: boolean }>(
    `SELECT id, name, is_system
     FROM roles
     WHERE id = $1`,
    [roleId]
  );
  return existing.rows[0] ?? null;
};

export const cascadeRoleRename = async (
  db: Pool | PoolClient,
  roleId: string,
  oldName: string,
  newName: string
): Promise<void> => {
  await db.query(
    `UPDATE users
     SET role = $1,
         updated_at = NOW()
     WHERE role = $2`,
    [newName, oldName]
  );

  await db.query(
    `UPDATE user_invitations
     SET role = $1
     WHERE role = $2`,
    [newName, oldName]
  );

  await db.query(
    `UPDATE registration_settings
     SET default_role = $1,
         updated_at = NOW()
     WHERE default_role = $2`,
    [newName, oldName]
  );

  await db.query('UPDATE roles SET name = $1 WHERE id = $2', [newName, roleId]);
};

export const updateRoleDescription = async (
  db: Pool | PoolClient,
  roleId: string,
  description: string | null
): Promise<void> => {
  await db.query(
    `UPDATE roles
     SET description = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [description, roleId]
  );
};

export const getRoleUsageCounts = async (
  db: Pool | PoolClient,
  roleName: string
): Promise<{ userCount: number; invitationCount: number; registrationCount: number }> => {
  const [u, i, r] = await Promise.all([
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM users
       WHERE role = $1`,
      [roleName]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM user_invitations
       WHERE role = $1
         AND accepted_at IS NULL
         AND is_revoked = false`,
      [roleName]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM registration_settings
       WHERE default_role = $1`,
      [roleName]
    ),
  ]);

  return {
    userCount: Number.parseInt(u.rows[0]?.count ?? '0', 10),
    invitationCount: Number.parseInt(i.rows[0]?.count ?? '0', 10),
    registrationCount: Number.parseInt(r.rows[0]?.count ?? '0', 10),
  };
};

export const deleteRoleRow = async (
  db: Pool | PoolClient,
  roleId: string
): Promise<void> => {
  await db.query('DELETE FROM roles WHERE id = $1', [roleId]);
};

export const getRoleNameRowById = async (
  roleId: string
): Promise<{ name: string } | null> => {
  const result = await pool.query<{ name: string }>('SELECT name FROM roles WHERE id = $1', [roleId]);
  return result.rows[0] ?? null;
};
