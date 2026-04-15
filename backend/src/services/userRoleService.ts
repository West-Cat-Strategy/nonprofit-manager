import { Pool, PoolClient } from 'pg';
import { logger } from '@config/logger';
import pool from '@config/database';
import { normalizeRoleSlug, slugifyRoleName } from '@utils/roleSlug';

type DbClient = Pool | PoolClient;

const hasRoleTables = async (db: DbClient): Promise<boolean> => {
  const result = await db.query(
    `SELECT to_regclass('public.roles') as roles_table,
            to_regclass('public.user_roles') as user_roles_table`
  );
  return Boolean(result.rows[0]?.roles_table) && Boolean(result.rows[0]?.user_roles_table);
};

const hasAssignmentSourceColumn = async (db: DbClient): Promise<boolean> => {
  const result = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'user_roles'
         AND column_name = 'assignment_source'
     ) AS exists`
  );
  return result.rows[0]?.exists === true;
};

const findRoleIdForName = async (
  db: DbClient,
  roleName: string
): Promise<string | null> => {
  const normalized = normalizeRoleSlug(roleName);
  if (!normalized) {
    return null;
  }

  const lookupNames = new Set([normalized, slugifyRoleName(roleName)]);
  const roleResult = await db.query<{ id: string; name: string }>('SELECT id, name FROM roles');
  const matchedRole = roleResult.rows.find((role) => {
    const normalizedRowName = normalizeRoleSlug(role.name) ?? slugifyRoleName(role.name);
    return lookupNames.has(role.name) || lookupNames.has(normalizedRowName);
  });

  return matchedRole?.id ?? null;
};

export const syncUserRole = async (
  userId: string,
  roleName: string,
  db: DbClient = pool
): Promise<void> => {
  try {
    const available = await hasRoleTables(db);
    if (!available) return;

    const roleId = await findRoleIdForName(db, roleName);
    if (!roleId) return;

    const supportsAssignmentSource = await hasAssignmentSourceColumn(db);

    if (!supportsAssignmentSource) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id <> $2', [userId, roleId]);
      await db.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id)
         DO NOTHING`,
        [userId, roleId]
      );
      return;
    }

    await db.query(
      `DELETE FROM user_roles
       WHERE user_id = $1
         AND assignment_source = 'primary'
         AND role_id <> $2`,
      [userId, roleId]
    );
    await db.query(
      `INSERT INTO user_roles (user_id, role_id, assignment_source)
       VALUES ($1, $2, 'primary')
       ON CONFLICT (user_id, role_id)
       DO UPDATE SET assignment_source = 'primary'`,
      [userId, roleId]
    );
  } catch (error) {
    logger.error('Failed to sync user role', { error, userId, roleName });
    throw error;
  }
};

export const setDirectUserRoles = async (
  userId: string,
  roleNames: string[],
  assignedBy?: string,
  db: DbClient = pool
): Promise<string[]> => {
  try {
    const available = await hasRoleTables(db);
    if (!available) return [];

    const supportsAssignmentSource = await hasAssignmentSourceColumn(db);

    const normalizedNames = Array.from(
      new Set(roleNames.map((roleName) => normalizeRoleSlug(roleName) ?? roleName).filter(Boolean))
    );
    const roleResult = await db.query<{ id: string; name: string }>(
      'SELECT id, name FROM roles ORDER BY priority DESC, name ASC'
    );
    const resolved = roleResult.rows.filter((row) =>
      normalizedNames.includes(normalizeRoleSlug(row.name) ?? row.name)
    );

    if (resolved.length !== normalizedNames.length) {
      const resolvedNames = new Set(resolved.map((row) => normalizeRoleSlug(row.name) ?? row.name));
      const missing = normalizedNames.filter((name) => !resolvedNames.has(name));
      throw new Error(`Unknown roles: ${missing.join(', ')}`);
    }

    if (supportsAssignmentSource) {
      await db.query(
        `DELETE FROM user_roles
         WHERE user_id = $1
           AND assignment_source = 'direct'`,
        [userId]
      );
    } else {
      const primaryRoleId = await findRoleIdForName(
        db,
        (
          await db.query<{ role: string }>('SELECT role FROM users WHERE id = $1', [userId])
        ).rows[0]?.role ?? ''
      );
      await db.query(
        `DELETE FROM user_roles
         WHERE user_id = $1
           ${primaryRoleId ? 'AND role_id <> $2' : ''}`,
        primaryRoleId ? [userId, primaryRoleId] : [userId]
      );
    }

    for (const row of resolved) {
      if (supportsAssignmentSource) {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, assignment_source, assigned_by)
           VALUES ($1, $2, 'direct', $3)
           ON CONFLICT (user_id, role_id)
           DO UPDATE SET assignment_source = CASE
             WHEN user_roles.assignment_source = 'primary' THEN 'primary'
             ELSE 'direct'
           END,
           assigned_by = COALESCE(EXCLUDED.assigned_by, user_roles.assigned_by)`,
          [userId, row.id, assignedBy ?? null]
        );
      } else {
        await db.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, role_id)
           DO UPDATE SET assigned_by = COALESCE(EXCLUDED.assigned_by, user_roles.assigned_by)`,
          [userId, row.id, assignedBy ?? null]
        );
      }
    }

    return resolved.map((row) => normalizeRoleSlug(row.name) ?? row.name);
  } catch (error) {
    logger.error('Failed to set direct user roles', { error, userId, roleNames });
    throw error;
  }
};

export const getDirectUserRoles = async (
  userId: string,
  db: DbClient = pool
): Promise<string[]> => {
  try {
    const available = await hasRoleTables(db);
    if (!available) return [];

    const supportsAssignmentSource = await hasAssignmentSourceColumn(db);

    if (!supportsAssignmentSource) {
      const primaryRole = (
        await db.query<{ role: string }>('SELECT role FROM users WHERE id = $1', [userId])
      ).rows[0]?.role;
      const primaryRoleId = primaryRole ? await findRoleIdForName(db, primaryRole) : null;
      const result = await db.query<{ name: string }>(
        `SELECT r.name
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1
           ${primaryRoleId ? 'AND ur.role_id <> $2' : ''}
         ORDER BY r.priority DESC, r.name ASC`,
        primaryRoleId ? [userId, primaryRoleId] : [userId]
      );

      return result.rows.map((row) => normalizeRoleSlug(row.name) ?? row.name);
    }

    const result = await db.query<{ name: string }>(
      `SELECT r.name
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
         AND ur.assignment_source = 'direct'
       ORDER BY r.priority DESC, r.name ASC`,
      [userId]
    );

    return result.rows.map((row) => normalizeRoleSlug(row.name) ?? row.name);
  } catch (error) {
    logger.error('Failed to get direct user roles', { error, userId });
    throw error;
  }
};
