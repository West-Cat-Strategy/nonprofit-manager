import type { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { RoleCatalogError } from './roleCatalogErrors';
import { normalizeRoleSlug, ROLE_SLUG_ALIASES } from '@utils/roleSlug';

export const CANONICAL_ROLE_SLUGS = ['admin', 'manager', 'staff', 'volunteer', 'viewer'] as const;
export type CanonicalRoleSlug = (typeof CANONICAL_ROLE_SLUGS)[number];

export const ROLE_SELECTOR_ALIASES =
  ROLE_SLUG_ALIASES as Record<string, CanonicalRoleSlug>;

const CANONICAL_ROLE_SET = new Set<string>(CANONICAL_ROLE_SLUGS);

const DEFAULT_ROLE_LABELS: Record<CanonicalRoleSlug, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
  volunteer: 'Volunteer',
  viewer: 'Viewer',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'View',
  update: 'Edit',
  delete: 'Delete',
  export: 'Export',
  manage: 'Manage',
  manage_registrations: 'Manage registrations',
  admin: 'Administer',
};

export interface RoleCatalogItem {
  id: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  priority: number;
}

export interface RoleSelectorItem {
  value: string;
  label: string;
  description: string;
  isSystem: boolean;
}

export interface PermissionCatalogItem {
  id: string;
  name: string;
  label: string;
  description: string;
  resource: string;
  action: string;
  category: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  permissions?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

const humanizePhrase = (value: string): string =>
  value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export { normalizeRoleSlug } from '@utils/roleSlug';

function getCanonicalRoleName(value: string): string {
  return normalizeRoleSlug(value) ?? value;
}

export const isSystemRoleSlug = (value: string | null | undefined): boolean => {
  const normalized = normalizeRoleSlug(value);
  return normalized ? CANONICAL_ROLE_SET.has(normalized) : false;
};

export const humanizeRoleLabel = (value: string): string => {
  const normalized = normalizeRoleSlug(value);
  if (normalized && DEFAULT_ROLE_LABELS[normalized as CanonicalRoleSlug]) {
    return DEFAULT_ROLE_LABELS[normalized as CanonicalRoleSlug];
  }

  return humanizePhrase(value);
};

const humanizePermissionLabel = (resource: string, action: string): string => {
  const resourceLabel = humanizePhrase(resource);
  const actionLabel = ACTION_LABELS[action] ?? humanizePhrase(action);
  return `${actionLabel} ${resourceLabel}`.trim();
};

const hasRoleTables = async (db: Pool | PoolClient = pool): Promise<boolean> => {
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

const hasPermissionTable = async (db: Pool | PoolClient = pool): Promise<boolean> => {
  const result = await db.query<{ permissions_table: string | null }>(
    `SELECT to_regclass('public.permissions') as permissions_table`
  );

  return Boolean(result.rows[0]?.permissions_table);
};

const mapRoleRow = (row: {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  priority: number | string;
  user_count: string | number;
  permissions: string[] | null;
}): RoleCatalogItem => ({
  id: row.id,
  name: getCanonicalRoleName(row.name),
  label: humanizeRoleLabel(row.name),
  description: row.description || '',
  permissions: Array.isArray(row.permissions) ? row.permissions.filter(Boolean) : [],
  isSystem: Boolean(row.is_system) || CANONICAL_ROLE_SET.has(getCanonicalRoleName(row.name)),
  userCount: Number.parseInt(String(row.user_count ?? 0), 10) || 0,
  priority: Number.parseInt(String(row.priority ?? 0), 10) || 0,
});

const findRoleRowByNormalizedName = async (
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

const loadPermissionIds = async (
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

const ensurePermissionsExist = async (
  db: Pool | PoolClient,
  permissionNames: string[]
): Promise<void> => {
  const resolved = await loadPermissionIds(db, permissionNames);
  const resolvedNames = new Set(resolved.map((permission) => permission.name));
  const missing = permissionNames.filter((permission) => !resolvedNames.has(permission));

  if (missing.length > 0) {
    throw new RoleCatalogError('UNKNOWN_PERMISSION', `Unknown permissions: ${missing.join(', ')}`);
  }
};

const withTransaction = async <T>(
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

export const getRoleCatalog = async (): Promise<RoleCatalogItem[]> => {
  if (!(await hasRoleTables())) {
    return [];
  }

  const result = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    priority: number;
    user_count: string;
    permissions: string[] | null;
  }>(
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

  return result.rows.map(mapRoleRow);
};

export const getRoleSelectorItems = async (): Promise<RoleSelectorItem[]> => {
  const roles = await getRoleCatalog();
  return roles.map((role) => ({
    value: role.name,
    label: role.label,
    description: role.description,
    isSystem: role.isSystem,
  }));
};

export const getPermissionCatalog = async (): Promise<PermissionCatalogItem[]> => {
  if (!(await hasPermissionTable())) {
    return [];
  }

  const result = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    resource: string;
    action: string;
  }>(
    `SELECT id, name, description, resource, action
     FROM permissions
     ORDER BY resource ASC, action ASC, name ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    label: humanizePermissionLabel(row.resource, row.action),
    description: row.description || '',
    resource: row.resource,
    action: row.action,
    category: humanizePhrase(row.resource),
  }));
};

export const createRole = async (input: CreateRoleInput): Promise<RoleCatalogItem> => {
  const normalizedName = normalizeRoleSlug(input.name);
  if (!normalizedName) {
    throw new RoleCatalogError('INVALID_INPUT', 'Role name is required');
  }

  if (CANONICAL_ROLE_SET.has(normalizedName)) {
    throw new RoleCatalogError('RESERVED', 'System role slugs are reserved');
  }

  const description = input.description?.trim() || null;
  const permissionNames = Array.from(new Set((input.permissions || []).map((permission) => permission.trim()).filter(Boolean)));

  await withTransaction(async (db) => {
    const existing = await findRoleRowByNormalizedName(db, normalizedName);
    if (existing) {
      throw new RoleCatalogError('CONFLICT', 'A role with this slug already exists');
    }

    await ensurePermissionsExist(db, permissionNames);

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO roles (name, description, is_system, priority)
       VALUES ($1, $2, false, 0)
       RETURNING id`,
      [normalizedName, description]
    );

    const roleId = inserted.rows[0]?.id;
    if (!roleId) {
      throw new Error('Failed to create role');
    }

    if (permissionNames.length > 0) {
      const resolvedPermissions = await loadPermissionIds(db, permissionNames);
      for (const permission of resolvedPermissions) {
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permission.id]
        );
      }
    }
  });

  const [role] = await getRoleCatalog().then((roles) => roles.filter((candidate) => candidate.name === normalizedName));
  if (!role) {
    throw new Error('Failed to reload created role');
  }
  return role;
};

export const updateRole = async (
  roleId: string,
  input: UpdateRoleInput
): Promise<RoleCatalogItem> => {
  const normalizedName = input.name ? normalizeRoleSlug(input.name) : null;
  const description = input.description === undefined ? undefined : input.description?.trim() || null;
  const permissionNames = input.permissions
    ? Array.from(new Set(input.permissions.map((permission) => permission.trim()).filter(Boolean)))
    : null;

  await withTransaction(async (db) => {
    const existing = await db.query<{
      id: string;
      name: string;
      is_system: boolean;
    }>(
      `SELECT id, name, is_system
       FROM roles
       WHERE id = $1`,
      [roleId]
    );

    if (existing.rows.length === 0) {
      throw new RoleCatalogError('NOT_FOUND', 'Role not found');
    }

    const role = existing.rows[0];
    const currentName = getCanonicalRoleName(role.name);
    const currentIsSystem = Boolean(role.is_system) || CANONICAL_ROLE_SET.has(currentName as CanonicalRoleSlug);

    if (currentIsSystem && normalizedName && normalizedName !== currentName) {
      throw new RoleCatalogError('RESERVED', 'System role slugs cannot be renamed');
    }

    if (normalizedName && normalizedName !== currentName) {
      if (CANONICAL_ROLE_SET.has(normalizedName)) {
        throw new RoleCatalogError('RESERVED', 'System role slugs are reserved');
      }

      const conflict = await findRoleRowByNormalizedName(db, normalizedName, roleId);
      if (conflict) {
        throw new RoleCatalogError('CONFLICT', 'A role with this slug already exists');
      }

      await db.query(
        `UPDATE users
         SET role = $1,
             updated_at = NOW()
         WHERE role = $2`,
        [normalizedName, role.name]
      );

      await db.query(
        `UPDATE user_invitations
         SET role = $1
         WHERE role = $2`,
        [normalizedName, role.name]
      );

      await db.query(
        `UPDATE registration_settings
         SET default_role = $1,
             updated_at = NOW()
         WHERE default_role = $2`,
        [normalizedName, role.name]
      );

      await db.query('UPDATE roles SET name = $1 WHERE id = $2', [normalizedName, roleId]);
    }

    if (description !== undefined) {
      await db.query(
        `UPDATE roles
         SET description = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [description, roleId]
      );
    }

    if (permissionNames) {
      await ensurePermissionsExist(db, permissionNames);
      await db.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      if (permissionNames.length > 0) {
        const resolvedPermissions = await loadPermissionIds(db, permissionNames);
        for (const permission of resolvedPermissions) {
          await db.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [roleId, permission.id]
          );
        }
      }
    }
  });

  const updated = (await getRoleCatalog()).find((role) => role.id === roleId);
  if (!updated) {
    throw new Error('Failed to reload updated role');
  }
  return updated;
};

export const deleteRole = async (roleId: string): Promise<void> => {
  await withTransaction(async (db) => {
    const existing = await db.query<{
      id: string;
      name: string;
      is_system: boolean;
    }>(
      `SELECT id, name, is_system
       FROM roles
       WHERE id = $1`,
      [roleId]
    );

    if (existing.rows.length === 0) {
      throw new RoleCatalogError('NOT_FOUND', 'Role not found');
    }

    const role = existing.rows[0];
    const currentName = getCanonicalRoleName(role.name);
    if (role.is_system || CANONICAL_ROLE_SET.has(currentName as CanonicalRoleSlug)) {
      throw new RoleCatalogError('RESERVED', 'System roles cannot be deleted');
    }

    const [userCount, invitationCount, registrationCount] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM users
         WHERE role = $1`,
        [role.name]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM user_invitations
         WHERE role = $1
           AND accepted_at IS NULL
           AND is_revoked = false`,
        [role.name]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM registration_settings
         WHERE default_role = $1`,
        [role.name]
      ),
    ]);

    const totalReferences =
      Number.parseInt(userCount.rows[0]?.count ?? '0', 10) +
      Number.parseInt(invitationCount.rows[0]?.count ?? '0', 10) +
      Number.parseInt(registrationCount.rows[0]?.count ?? '0', 10);

    if (totalReferences > 0) {
      throw new RoleCatalogError('IN_USE', 'Role is still assigned to users or invitations');
    }

    await db.query('DELETE FROM roles WHERE id = $1', [roleId]);
  });
};

export const getRoleNameById = async (roleId: string): Promise<string | null> => {
  const result = await pool.query<{ name: string }>('SELECT name FROM roles WHERE id = $1', [roleId]);
  return result.rows[0]?.name ? getCanonicalRoleName(result.rows[0].name) : null;
};

export const getRoleByName = async (
  name: string,
  db: Pool | PoolClient = pool
): Promise<RoleCatalogItem | null> => {
  const normalizedName = normalizeRoleSlug(name);
  if (!normalizedName) {
    return null;
  }

  if (!(await hasRoleTables(db))) {
    return null;
  }

  const row = await findRoleRowByNormalizedName(db, normalizedName);
  if (!row) {
    return null;
  }

  const result = await db.query<{
    id: string;
    name: string;
    description: string | null;
    is_system: boolean;
    priority: number;
    user_count: string;
    permissions: string[] | null;
  }>(
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
    [row.id]
  );

  const roleRow = result.rows[0];
  return roleRow ? mapRoleRow(roleRow) : null;
};
