-- Add queue-scan indexes for report export worker polling.

CREATE INDEX IF NOT EXISTS idx_report_export_jobs_worker_pending
  ON report_export_jobs(created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_report_export_jobs_worker_failed_retry
  ON report_export_jobs(updated_at ASC, created_at ASC)
  WHERE status = 'failed';
