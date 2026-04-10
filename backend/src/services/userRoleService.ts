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

    await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await db.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );
  } catch (error) {
    logger.error('Failed to sync user role', { error, userId, roleName });
    throw error;
  }
};
