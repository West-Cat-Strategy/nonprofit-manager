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
