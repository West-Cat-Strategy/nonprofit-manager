-- Migration 069: public submission ledger, report export jobs, and append-only activity/conversion events

CREATE TABLE IF NOT EXISTS public_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  submission_type VARCHAR(50) NOT NULL CHECK (
    submission_type IN ('contact-form', 'newsletter-signup', 'volunteer-interest-form', 'donation-form')
  ),
  form_key VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255),
  payload_hash VARCHAR(64) NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB,
  result_entity_type VARCHAR(50),
  result_entity_id UUID,
  ip_hash VARCHAR(64),
  user_agent_hash VARCHAR(64),
  status VARCHAR(20) NOT NULL CHECK (status IN ('processing', 'accepted', 'rejected')),
  error_message TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_submissions_site_idempotency
  ON public_submissions(site_id, submission_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_public_submissions_site_created
  ON public_submissions(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_submissions_org_created
  ON public_submissions(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_submissions_status
  ON public_submissions(status, created_at DESC);

COMMENT ON TABLE public_submissions IS 'Append-only ledger for public website form submissions and idempotent replays';

CREATE TABLE IF NOT EXISTS report_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  saved_report_id UUID REFERENCES saved_reports(id) ON DELETE SET NULL,
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  job_source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (job_source IN ('manual', 'scheduled', 'snapshot')),
  name VARCHAR(255) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'xlsx')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  definition JSONB NOT NULL,
  filter_hash VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(255),
  rows_count INTEGER,
  runtime_ms INTEGER,
  failure_message TEXT,
  artifact_path TEXT,
  artifact_content_type VARCHAR(255),
  artifact_file_name VARCHAR(255),
  artifact_size_bytes BIGINT,
  artifact_expires_at TIMESTAMP WITH TIME ZONE,
  retention_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_export_jobs_org_idempotency
  ON report_export_jobs(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_export_jobs_org_created
  ON report_export_jobs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_export_jobs_status_created
  ON report_export_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_export_jobs_scheduled_report
  ON report_export_jobs(scheduled_report_id, created_at DESC)
  WHERE scheduled_report_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_export_jobs_updated_at'
  ) THEN
    CREATE TRIGGER update_report_export_jobs_updated_at
      BEFORE UPDATE ON report_export_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE report_export_jobs IS 'Persisted report export executions with artifact metadata for reuse and polling';

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  site_id UUID REFERENCES published_sites(id) ON DELETE SET NULL,
  activity_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('case', 'donation', 'volunteer', 'event', 'contact', 'task')),
  entity_id UUID NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_events_org_occurred
  ON activity_events(organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_entity
  ON activity_events(entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_related_entity
  ON activity_events(related_entity_type, related_entity_id, occurred_at DESC)
  WHERE related_entity_type IS NOT NULL AND related_entity_id IS NOT NULL;

COMMENT ON TABLE activity_events IS 'Append-only normalized activity feed rows for dashboard and entity timelines';

CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  site_id UUID NOT NULL REFERENCES published_sites(id) ON DELETE CASCADE,
  conversion_type VARCHAR(50) NOT NULL CHECK (conversion_type IN ('pageview', 'form_submit', 'donation', 'event_register')),
  conversion_step VARCHAR(20) NOT NULL CHECK (conversion_step IN ('view', 'submit', 'confirm')),
  page_path VARCHAR(500) NOT NULL,
  visitor_id VARCHAR(100),
  session_id VARCHAR(100),
  referrer TEXT,
  user_agent TEXT,
  source_entity_type VARCHAR(50),
  source_entity_id UUID,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_site_occurred
  ON conversion_events(site_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_events_site_step
  ON conversion_events(site_id, conversion_step, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_events_site_type_step
  ON conversion_events(site_id, conversion_type, conversion_step, occurred_at DESC);

COMMENT ON TABLE conversion_events IS 'Append-only site conversion telemetry used for funnel analytics and public-flow reporting';
