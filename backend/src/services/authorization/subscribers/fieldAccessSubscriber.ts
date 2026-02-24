import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  AuthorizationSubscriberContext,
  FieldAccessMatrix,
} from '@app-types/authorization';
import type { AuthorizationSubscriber } from './types';

const SOURCE = 'field_access_subscriber';

interface FieldAccessRow {
  resource: string;
  field_name: string;
  can_read: boolean;
  can_write: boolean;
  mask_on_read: boolean;
  mask_type: string | null;
}

const hasRequiredTables = async (): Promise<boolean> => {
  const result = await pool.query<{
    field_access_rules_table: string | null;
    roles_table: string | null;
    user_roles_table: string | null;
  }>(
    `SELECT
       to_regclass('public.field_access_rules') as field_access_rules_table,
       to_regclass('public.roles') as roles_table,
       to_regclass('public.user_roles') as user_roles_table`
  );

  const row = result.rows[0];
  return Boolean(row?.field_access_rules_table && row?.roles_table && row?.user_roles_table);
};

const buildFieldAccessMatrix = async (
  context: AuthorizationSubscriberContext
): Promise<FieldAccessMatrix> => {
  const matrix: FieldAccessMatrix = {};

  if (!(await hasRequiredTables())) {
    logger.warn('Field access matrix tables unavailable; returning empty matrix');
    return matrix;
  }

  const result = await pool.query<FieldAccessRow>(
    `SELECT DISTINCT ON (far.resource, far.field_name)
       far.resource,
       far.field_name,
       far.can_read,
       far.can_write,
       far.mask_on_read,
       far.mask_type
     FROM field_access_rules far
     INNER JOIN roles r ON r.id = far.role_id
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1
     ORDER BY far.resource, far.field_name, r.priority DESC`,
    [context.userId]
  );

  for (const row of result.rows) {
    if (!matrix[row.resource]) {
      matrix[row.resource] = {};
    }

    matrix[row.resource][row.field_name] = {
      canRead: row.can_read,
      canWrite: row.can_write,
      maskOnRead: row.mask_on_read,
      maskType: row.mask_type,
      source: SOURCE,
    };
  }

  return matrix;
};

export const fieldAccessSubscriber: AuthorizationSubscriber = {
  id: SOURCE,
  async collect(context: AuthorizationSubscriberContext) {
    try {
      return {
        fieldAccess: await buildFieldAccessMatrix(context),
      };
    } catch (error) {
      logger.warn('Failed to build field access matrix', {
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { fieldAccess: {} };
    }
  },
};
