import { Pool, PoolClient } from 'pg';
import { logger } from '../config/logger';
import pool from '../config/database';

type DbClient = Pool | PoolClient;

const hasRoleTables = async (db: DbClient): Promise<boolean> => {
  const result = await db.query(
    `SELECT to_regclass('public.roles') as roles_table,
            to_regclass('public.user_roles') as user_roles_table`
  );
  return Boolean(result.rows[0]?.roles_table) && Boolean(result.rows[0]?.user_roles_table);
};

export const syncUserRole = async (
  userId: string,
  roleName: string,
  db: DbClient = pool
): Promise<void> => {
  try {
    const available = await hasRoleTables(db);
    if (!available) return;

    const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleResult.rows.length === 0) return;

    const roleId = roleResult.rows[0].id;

    await db.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await db.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );
  } catch (error) {
    logger.error('Failed to sync user role', { error, userId, roleName });
  }
};
