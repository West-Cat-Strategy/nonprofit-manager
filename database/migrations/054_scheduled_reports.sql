-- Migration 054: Scheduled report definitions and execution logs

CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    saved_report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    recipients TEXT[] NOT NULL DEFAULT '{}',
    format VARCHAR(10) NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'xlsx')),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    hour SMALLINT NOT NULL DEFAULT 9 CHECK (hour >= 0 AND hour <= 23),
    minute SMALLINT NOT NULL DEFAULT 0 CHECK (minute >= 0 AND minute <= 59),
    day_of_week SMALLINT CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    day_of_month SMALLINT CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 28)),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON scheduled_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_saved_report ON scheduled_reports(saved_report_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_due
    ON scheduled_reports(is_active, next_run_at)
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_processing
    ON scheduled_reports(processing_started_at)
    WHERE processing_started_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS scheduled_report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_report_id UUID NOT NULL REFERENCES scheduled_reports(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    rows_count INTEGER,
    file_format VARCHAR(10) CHECK (file_format IN ('csv', 'xlsx')),
    file_name VARCHAR(255),
    recipients TEXT[] NOT NULL DEFAULT '{}',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_runs_report ON scheduled_report_runs(scheduled_report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_runs_status ON scheduled_report_runs(status);

COMMENT ON TABLE scheduled_reports IS 'Recurring report delivery definitions (email-first)';
COMMENT ON TABLE scheduled_report_runs IS 'Execution history for scheduled reports';
