import os from 'os';
import pool from '@config/database';
import { logger } from '@config/logger';

const INSTANCE_ID = process.env.WORKER_INSTANCE_ID ?? `${os.hostname()}:${process.pid}`;

const messageFromError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

class SchedulerHealthService {
  async recordSchedulerState(name: string, enabled: boolean): Promise<void> {
    await this.safeQuery(
      `INSERT INTO worker_scheduler_health (
         scheduler_name, instance_id, status, enabled, started_at, last_heartbeat_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (scheduler_name) DO UPDATE
          SET instance_id = EXCLUDED.instance_id,
              status = EXCLUDED.status,
              enabled = EXCLUDED.enabled,
              started_at = CASE
                WHEN worker_scheduler_health.instance_id IS DISTINCT FROM EXCLUDED.instance_id
                  THEN EXCLUDED.started_at
                ELSE worker_scheduler_health.started_at
              END,
              last_heartbeat_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP`,
      [name, INSTANCE_ID, enabled ? 'enabled' : 'disabled', enabled]
    );
  }

  async recordTickStarted(name: string): Promise<void> {
    await this.safeQuery(
      `INSERT INTO worker_scheduler_health (
         scheduler_name, instance_id, status, enabled, started_at, last_heartbeat_at,
         last_tick_started_at, updated_at
       )
       VALUES ($1, $2, 'running', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (scheduler_name) DO UPDATE
          SET instance_id = EXCLUDED.instance_id,
              status = 'running',
              enabled = true,
              last_heartbeat_at = CURRENT_TIMESTAMP,
              last_tick_started_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP`,
      [name, INSTANCE_ID]
    );
  }

  async recordTickSucceeded(name: string, processed: number): Promise<void> {
    await this.safeQuery(
      `UPDATE worker_scheduler_health
          SET status = 'healthy',
              enabled = true,
              last_heartbeat_at = CURRENT_TIMESTAMP,
              last_success_at = CURRENT_TIMESTAMP,
              last_processed_count = $2,
              consecutive_failures = 0,
              last_error_at = NULL,
              last_error = NULL,
              updated_at = CURRENT_TIMESTAMP
        WHERE scheduler_name = $1`,
      [name, processed]
    );
  }

  async recordTickFailed(name: string, error: unknown, processed: number): Promise<void> {
    await this.safeQuery(
      `UPDATE worker_scheduler_health
          SET status = 'error',
              enabled = true,
              last_heartbeat_at = CURRENT_TIMESTAMP,
              last_error_at = CURRENT_TIMESTAMP,
              last_error = $2,
              last_processed_count = $3,
              consecutive_failures = consecutive_failures + 1,
              updated_at = CURRENT_TIMESTAMP
        WHERE scheduler_name = $1`,
      [name, messageFromError(error), processed]
    );
  }

  async recordSchedulerStopped(name: string): Promise<void> {
    await this.safeQuery(
      `UPDATE worker_scheduler_health
          SET status = 'stopped',
              last_heartbeat_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
        WHERE scheduler_name = $1`,
      [name]
    );
  }

  private async safeQuery(sql: string, values: unknown[]): Promise<void> {
    try {
      await pool.query(sql, values);
    } catch (error) {
      logger.warn('Worker scheduler health persistence failed', {
        error: messageFromError(error),
      });
    }
  }
}

export const schedulerHealthService = new SchedulerHealthService();
