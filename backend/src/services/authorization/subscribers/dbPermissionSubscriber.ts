import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  AuthorizationSubscriberContext,
  DbPermissionMatrix,
} from '@app-types/authorization';
import type { AuthorizationSubscriber } from './types';

const SOURCE = 'db_permission_subscriber';

interface PermissionRow {
  name: string;
  resource: string;
  action: string;
  allowed: boolean;
}

const hasRequiredTables = async (): Promise<boolean> => {
  const result = await pool.query<{
    permissions_table: string | null;
    role_permissions_table: string | null;
    user_roles_table: string | null;
  }>(
    `SELECT
       to_regclass('public.permissions') as permissions_table,
       to_regclass('public.role_permissions') as role_permissions_table,
       to_regclass('public.user_roles') as user_roles_table`
  );

  const row = result.rows[0];
  return Boolean(row?.permissions_table && row?.role_permissions_table && row?.user_roles_table);
};

const buildDbPermissionMatrix = async (context: AuthorizationSubscriberContext): Promise<DbPermissionMatrix> => {
  const matrix: DbPermissionMatrix = {};

  if (!(await hasRequiredTables())) {
    logger.warn('DB permission matrix tables unavailable; returning empty matrix');
    return matrix;
  }

  const result = await pool.query<PermissionRow>(
    `SELECT
       p.name,
       p.resource,
       p.action,
       EXISTS (
         SELECT 1
         FROM role_permissions rp
         INNER JOIN user_roles ur ON ur.role_id = rp.role_id
         WHERE ur.user_id = $1
           AND rp.permission_id = p.id
       ) as allowed
     FROM permissions p
     ORDER BY p.name ASC`,
    [context.userId]
  );

  for (const row of result.rows) {
    matrix[row.name] = {
      allowed: row.allowed,
      resource: row.resource,
      action: row.action,
      source: SOURCE,
    };
  }

  return matrix;
};

export const dbPermissionSubscriber: AuthorizationSubscriber = {
  id: SOURCE,
  async collect(context: AuthorizationSubscriberContext) {
    try {
      return {
        dbPermissions: await buildDbPermissionMatrix(context),
      };
    } catch (error) {
      logger.warn('Failed to build DB permission matrix', {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { dbPermissions: {} };
    }
  },
};
