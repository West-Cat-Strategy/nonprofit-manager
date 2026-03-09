import pool from '@config/database';
import { logger } from '@config/logger';
import { activityEventService } from '@services/activityEventService';

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
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO portal_activity_logs (portal_user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        input.portalUserId,
        input.action,
        input.details || null,
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );

    const portalUser = await pool.query<{
      contact_id: string | null;
      account_id: string | null;
      display_name: string | null;
    }>(
      `SELECT
         pu.contact_id,
         c.account_id,
         NULLIF(TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))), '') AS display_name
       FROM portal_users pu
       LEFT JOIN contacts c ON c.id = pu.contact_id
       WHERE pu.id = $1
       LIMIT 1`,
      [input.portalUserId]
    );

    const contactId = portalUser.rows[0]?.contact_id;
    if (contactId) {
      await activityEventService.recordEvent({
        organizationId: portalUser.rows[0]?.account_id || null,
        type: 'portal_action',
        title: 'Portal activity',
        description: input.details || input.action,
        userName: portalUser.rows[0]?.display_name || null,
        entityType: 'contact',
        entityId: contactId,
        sourceTable: inserted.rows[0]?.id ? 'portal_activity_logs' : null,
        sourceRecordId: inserted.rows[0]?.id || null,
        metadata: {
          action: input.action,
          portalUserId: input.portalUserId,
          userAgent: input.userAgent || null,
        },
      });
    }
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
