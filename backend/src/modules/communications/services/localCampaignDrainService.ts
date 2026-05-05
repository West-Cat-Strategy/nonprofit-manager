import pool from '@config/database';
import { logger } from '@config/logger';
import { sendCampaignRun } from './communicationsService';

const DEFAULT_STALE_SENDING_RECOVERY_MS = 15 * 60 * 1000;

const toNumberOrDefault = (rawValue: string | undefined, fallback: number): number => {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

export const recoverStaleLocalCampaignSendingRecipients = async (
  maxAgeMs = toNumberOrDefault(
    process.env.LOCAL_CAMPAIGN_STALE_SENDING_RECOVERY_MS,
    DEFAULT_STALE_SENDING_RECOVERY_MS
  )
): Promise<number> => {
  const staleAgeMs = Math.max(Math.floor(maxAgeMs), 1_000);
  const result = await pool.query<{ id: string }>(
    `WITH stale_recipients AS (
       SELECT crr.id
         FROM campaign_run_recipients crr
         INNER JOIN campaign_runs cr ON cr.id = crr.campaign_run_id
        WHERE cr.provider = 'local_email'
          AND cr.status = 'sending'
          AND crr.status = 'sending'
          AND crr.sent_at IS NULL
          AND crr.updated_at <= CURRENT_TIMESTAMP - ($1::int * INTERVAL '1 millisecond')
        ORDER BY crr.updated_at ASC, crr.created_at ASC
        LIMIT 500
        FOR UPDATE SKIP LOCKED
     )
     UPDATE campaign_run_recipients crr
        SET status = 'queued',
            failure_message = NULL,
            updated_at = CURRENT_TIMESTAMP
       FROM stale_recipients
      WHERE crr.id = stale_recipients.id
      RETURNING crr.id`,
    [staleAgeMs]
  );

  const recovered = result.rows.length;
  if (recovered > 0) {
    logger.warn('Recovered stale local campaign recipients from sending state', {
      recovered,
      staleAgeMs,
    });
  }

  return recovered;
};

export const drainDueLocalCampaignRuns = async (limit = 10): Promise<number> => {
  const batchLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  await recoverStaleLocalCampaignSendingRecipients();
  const dueRuns = await pool.query<{ id: string }>(
    `WITH candidate_runs AS (
       SELECT cr.id
         FROM campaign_runs cr
        WHERE cr.provider = 'local_email'
          AND (
            (cr.status = 'scheduled'
              AND cr.requested_send_time IS NOT NULL
              AND cr.requested_send_time <= CURRENT_TIMESTAMP)
            OR cr.status = 'sending'
          )
          AND EXISTS (
            SELECT 1
              FROM campaign_run_recipients crr
             WHERE crr.campaign_run_id = cr.id
               AND crr.status = 'queued'
          )
        ORDER BY COALESCE(cr.requested_send_time, cr.updated_at) ASC, cr.created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     ),
     marked_runs AS (
       UPDATE campaign_runs cr
          SET status = CASE WHEN cr.status = 'scheduled' THEN 'sending' ELSE cr.status END,
              counts = CASE
                WHEN cr.status = 'scheduled'
                  THEN COALESCE(cr.counts, '{}'::jsonb) || jsonb_build_object(
                    'deliveryDrainStartedAt',
                    CURRENT_TIMESTAMP
                  )
                ELSE cr.counts
              END,
              updated_at = CURRENT_TIMESTAMP
         FROM candidate_runs
        WHERE cr.id = candidate_runs.id
        RETURNING cr.id
     )
     SELECT id FROM marked_runs`,
    [batchLimit]
  );

  let processed = 0;
  for (const row of dueRuns.rows) {
    try {
      const result = await sendCampaignRun(row.id);
      if (result) {
        processed += 1;
      }
    } catch (error) {
      logger.warn('Local communications campaign drain failed for run', {
        runId: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return processed;
};
