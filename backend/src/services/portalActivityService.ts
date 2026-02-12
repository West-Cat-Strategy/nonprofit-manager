import pool from '@config/database';
import { logger } from '@config/logger';

export interface PortalActivityEntry {
  id: string;
  portal_user_id: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface LogPortalActivityInput {
  portalUserId: string;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const logPortalActivity = async (input: LogPortalActivityInput): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO portal_activity_logs (portal_user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.portalUserId,
        input.action,
        input.details || null,
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );
  } catch (error) {
    logger.warn('Failed to log portal activity', { error, portalUserId: input.portalUserId, action: input.action });
  }
};

export const getPortalActivity = async (
  portalUserId: string,
  limit = 20
): Promise<PortalActivityEntry[]> => {
  const result = await pool.query(
    `SELECT id, portal_user_id, action, details, ip_address, user_agent, created_at
     FROM portal_activity_logs
     WHERE portal_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [portalUserId, limit]
  );
  return result.rows;
};
