import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { logger } from '../config/logger';
import { AuthRequest } from './auth';
import type { DataScopeContext, DataScopeFilter } from '../types/dataScope';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeFilter = (filter: unknown): DataScopeFilter | undefined => {
  if (!isPlainObject(filter)) return undefined;
  const accountIds = Array.isArray(filter.accountIds)
    ? (filter.accountIds as string[]).filter(Boolean)
    : undefined;
  const contactIds = Array.isArray(filter.contactIds)
    ? (filter.contactIds as string[]).filter(Boolean)
    : undefined;
  const createdByUserIds = Array.isArray(filter.createdByUserIds)
    ? (filter.createdByUserIds as string[]).filter(Boolean)
    : undefined;
  const accountTypes = Array.isArray(filter.accountTypes)
    ? (filter.accountTypes as string[]).filter(Boolean)
    : undefined;

  return {
    ...(accountIds?.length ? { accountIds } : {}),
    ...(contactIds?.length ? { contactIds } : {}),
    ...(createdByUserIds?.length ? { createdByUserIds } : {}),
    ...(accountTypes?.length ? { accountTypes } : {}),
  };
};

export const loadDataScope = (resource: string) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole === 'admin') {
        return next();
      }

      const result = await pool.query(
        `SELECT ds.*
         FROM data_scopes ds
         LEFT JOIN user_roles ur
           ON ds.role_id = ur.role_id
           AND ur.user_id = $1
         WHERE ds.is_active = true
           AND ds.resource = $2
           AND (ds.user_id = $1 OR ur.user_id = $1)
         ORDER BY ds.priority DESC, ds.created_at ASC`,
        [userId, resource]
      );

      if (result.rows.length === 0) {
        return next();
      }

      const scopeRow = result.rows[0] as Record<string, unknown>;
      const filter = normalizeFilter(scopeRow.scope_filter);
      const context: DataScopeContext = {
        resource,
        scopeId: scopeRow.id as string,
        filter,
      };

      req.dataScope = context;
      return next();
    } catch (error) {
      logger.error('Failed to load data scope', { error, resource, userId: req.user?.id });
      return next();
    }
  };
};

export default loadDataScope;
