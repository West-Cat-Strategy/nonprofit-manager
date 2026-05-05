-- Migration 119: Worker scheduler health
-- Created: 2026-05-03
-- Description:
--   * records DB-backed worker scheduler heartbeat, last success, and last error
--   * gives operators a local visibility surface without adding public APIs

CREATE TABLE IF NOT EXISTS worker_scheduler_health (
  scheduler_name TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  status VARCHAR(30) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,
  last_tick_started_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  last_processed_count INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT worker_scheduler_health_status_check CHECK (
    status IN ('enabled', 'disabled', 'running', 'healthy', 'error', 'stopped')
  ),
  CONSTRAINT worker_scheduler_health_processed_count_check CHECK (last_processed_count >= 0),
  CONSTRAINT worker_scheduler_health_failures_check CHECK (consecutive_failures >= 0)
);

CREATE INDEX IF NOT EXISTS idx_worker_scheduler_health_status
  ON worker_scheduler_health(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_worker_scheduler_health_heartbeat
  ON worker_scheduler_health(last_heartbeat_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_worker_scheduler_health_updated_at'
  ) THEN
    CREATE TRIGGER update_worker_scheduler_health_updated_at
      BEFORE UPDATE ON worker_scheduler_health
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE worker_scheduler_health IS
  'Local operator visibility for background worker scheduler heartbeat, last success, and last error';
