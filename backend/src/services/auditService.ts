import type { Pool, PoolClient } from 'pg';
import { logger } from '@config/logger';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AppendAuditLogInput {
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  userId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: 'success' | 'failure' | 'error';
  requestId?: string;
}

export const appendAuditLog = async (
  db: Queryable,
  input: AppendAuditLogInput
): Promise<void> => {
  let normalizedDetails: Record<string, unknown> | undefined = input.details
    ? { ...input.details }
    : undefined;

  if (input.requestId) {
    if (!normalizedDetails) {
      normalizedDetails = {};
    }
    normalizedDetails.requestId = input.requestId;
  }

  const resourceId =
    input.resourceId && UUID_RE.test(input.resourceId) ? input.resourceId : null;

  if (input.resourceId && !resourceId) {
    if (!normalizedDetails) {
      normalizedDetails = {};
    }
    normalizedDetails.resourceRef = input.resourceId;
  }

  try {
    await db.query(
      `INSERT INTO audit_logs (
         action,
         resource_type,
         resource_id,
         user_id,
         details,
         ip_address,
         user_agent,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.action,
        input.resourceType || null,
        resourceId,
        input.userId || null,
        normalizedDetails ? JSON.stringify(normalizedDetails) : null,
        input.ipAddress || null,
        input.userAgent || null,
        input.status || 'success',
      ]
    );
  } catch (error) {
    logger.warn('Failed to append audit log', {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
