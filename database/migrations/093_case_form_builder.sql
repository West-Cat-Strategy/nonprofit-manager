-- Migration 093: Case-centric form builder
-- Created: 2026-04-16
-- Description: Adds case-type form defaults, case-linked assignments, immutable submissions,
-- asset tracking, and hashed public access tokens for case-centric intake workflows.

CREATE TABLE IF NOT EXISTS case_form_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_type_id UUID NOT NULL REFERENCES case_types(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_case_form_defaults_case_type
  ON case_form_defaults(case_type_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_defaults_account
  ON case_form_defaults(account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS case_form_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    case_type_id UUID REFERENCES case_types(id) ON DELETE SET NULL,
    source_default_id UUID REFERENCES case_form_defaults(id) ON DELETE SET NULL,
    source_default_version INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_draft_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_draft_saved_at TIMESTAMP WITH TIME ZONE,
    due_at TIMESTAMP WITH TIME ZONE,
    recipient_email VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT case_form_assignments_status_check CHECK (
      status IN ('draft', 'sent', 'viewed', 'in_progress', 'submitted', 'reviewed', 'closed', 'expired', 'cancelled')
    )
);

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_case
  ON case_form_assignments(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_contact
  ON case_form_assignments(contact_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assignments_account
  ON case_form_assignments(account_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS case_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES case_form_assignments(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    submission_number INTEGER NOT NULL,
    client_submission_id VARCHAR(255),
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    mapping_audit JSONB NOT NULL DEFAULT '[]'::jsonb,
    response_packet_file_name VARCHAR(255),
    response_packet_file_path VARCHAR(500),
    response_packet_case_document_id UUID,
    response_packet_contact_document_id UUID,
    submitted_by_actor_type VARCHAR(20) NOT NULL,
    submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_by_portal_user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
    access_token_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT case_form_submissions_submission_number_unique UNIQUE (assignment_id, submission_number),
    CONSTRAINT case_form_submissions_actor_check CHECK (submitted_by_actor_type IN ('staff', 'portal', 'public'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_form_submissions_client_submission_id
  ON case_form_submissions(assignment_id, client_submission_id)
  WHERE client_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_case_form_submissions_assignment
  ON case_form_submissions(assignment_id, created_at DESC);

CREATE TABLE IF NOT EXISTS case_form_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES case_form_assignments(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES case_form_submissions(id) ON DELETE SET NULL,
    asset_kind VARCHAR(20) NOT NULL,
    question_key VARCHAR(120) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(255) NOT NULL,
    created_by_actor_type VARCHAR(20) NOT NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_portal_user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT case_form_assets_kind_check CHECK (asset_kind IN ('upload', 'signature')),
    CONSTRAINT case_form_assets_actor_check CHECK (created_by_actor_type IN ('staff', 'portal', 'public'))
);

CREATE INDEX IF NOT EXISTS idx_case_form_assets_assignment
  ON case_form_assets(assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assets_submission
  ON case_form_assets(submission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_assets_question
  ON case_form_assets(assignment_id, question_key, created_at DESC);

CREATE TABLE IF NOT EXISTS case_form_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES case_form_assignments(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    latest_submission_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_form_access_tokens_assignment
  ON case_form_access_tokens(assignment_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_form_access_tokens_contact
  ON case_form_access_tokens(contact_id, expires_at DESC);
