-- Migration 050: Case client visibility + notes/outcomes/topics/documents
-- Created: 2026-02-23
-- Description: Adds client visibility controls and case-native outcomes/topics/documents support.

-- ---------------------------------------------------------------------------
-- Cases: client visibility gate
-- ---------------------------------------------------------------------------
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS client_viewable BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cases_contact_client_viewable_updated
  ON cases(contact_id, client_viewable, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Case notes: client visibility + category + update audit
-- ---------------------------------------------------------------------------
ALTER TABLE case_notes
  ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Conservative backfill for historic notes that were designed for portal message visibility.
UPDATE case_notes
SET visible_to_client = true
WHERE visible_to_client = false
  AND is_internal = false
  AND note_type = 'portal_message';

CREATE INDEX IF NOT EXISTS idx_case_notes_case_visible_created
  ON case_notes(case_id, visible_to_client, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_notes_case_created_desc
  ON case_notes(case_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Case outcomes: structured events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  outcome_type VARCHAR(100),
  outcome_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_case_outcomes_case_date
  ON case_outcomes(case_id, outcome_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_outcomes_account_created
  ON case_outcomes(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_outcomes_case_visible
  ON case_outcomes(case_id, visible_to_client)
  WHERE visible_to_client = true;

-- ---------------------------------------------------------------------------
-- Topic taxonomy + per-case topic events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_topic_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (account_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_case_topic_definitions_account_active
  ON case_topic_definitions(account_id, is_active, name);

CREATE TABLE IF NOT EXISTS case_topic_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  topic_definition_id UUID NOT NULL REFERENCES case_topic_definitions(id) ON DELETE RESTRICT,
  discussed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_case_topic_events_case_discussed
  ON case_topic_events(case_id, discussed_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_topic_events_account_created
  ON case_topic_events(account_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Case documents: activate case-native model with upload metadata + visibility
-- ---------------------------------------------------------------------------
ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Backfill case document metadata for existing rows.
UPDATE case_documents
SET
  account_id = COALESCE(case_documents.account_id, c.account_id),
  file_name = COALESCE(case_documents.file_name, NULLIF(BTRIM(case_documents.document_name), '')),
  original_filename = COALESCE(case_documents.original_filename, NULLIF(BTRIM(case_documents.document_name), '')),
  created_at = COALESCE(case_documents.created_at, case_documents.uploaded_at, CURRENT_TIMESTAMP)
FROM cases c
WHERE c.id = case_documents.case_id;

CREATE INDEX IF NOT EXISTS idx_case_documents_case_created_desc
  ON case_documents(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_visible
  ON case_documents(case_id, visible_to_client)
  WHERE visible_to_client = true;
CREATE INDEX IF NOT EXISTS idx_case_documents_account_created_desc
  ON case_documents(account_id, created_at DESC);

-- Optional backfill from contact_documents for rows already linked to a case.
INSERT INTO case_documents (
  case_id,
  account_id,
  document_name,
  document_type,
  description,
  file_path,
  file_size,
  mime_type,
  file_name,
  original_filename,
  visible_to_client,
  is_active,
  created_at,
  updated_at,
  uploaded_at,
  uploaded_by,
  updated_by
)
SELECT
  cd.case_id,
  c.account_id,
  COALESCE(NULLIF(BTRIM(cd.title), ''), cd.original_name),
  cd.document_type,
  cd.description,
  cd.file_path,
  cd.file_size::bigint,
  cd.mime_type,
  cd.file_name,
  cd.original_name,
  cd.is_portal_visible,
  cd.is_active,
  COALESCE(cd.created_at, CURRENT_TIMESTAMP),
  COALESCE(cd.updated_at, cd.created_at, CURRENT_TIMESTAMP),
  COALESCE(cd.created_at, CURRENT_TIMESTAMP),
  cd.created_by,
  cd.created_by
FROM contact_documents cd
JOIN cases c ON c.id = cd.case_id
LEFT JOIN case_documents existing
  ON existing.case_id = cd.case_id
  AND existing.file_path = cd.file_path
  AND COALESCE(existing.original_filename, existing.document_name) = cd.original_name
WHERE cd.case_id IS NOT NULL
  AND existing.id IS NULL;

