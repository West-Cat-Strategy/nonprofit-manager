-- Migration 085: Case type and outcome assignments
-- Created: 2026-03-29
-- Description: Add many-to-many assignment tables for case types and case-level outcomes, then backfill from legacy scalar fields.

CREATE TABLE IF NOT EXISTS case_type_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    case_type_id UUID NOT NULL REFERENCES case_types(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    CONSTRAINT case_type_assignments_case_unique UNIQUE (case_id, case_type_id)
);

CREATE INDEX IF NOT EXISTS idx_case_type_assignments_case_id
  ON case_type_assignments(case_id);

CREATE INDEX IF NOT EXISTS idx_case_type_assignments_case_type_id
  ON case_type_assignments(case_type_id);

CREATE INDEX IF NOT EXISTS idx_case_type_assignments_primary
  ON case_type_assignments(case_id, is_primary DESC, sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS case_outcome_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    outcome_value VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    CONSTRAINT case_outcome_assignments_case_unique UNIQUE (case_id, outcome_value)
);

CREATE INDEX IF NOT EXISTS idx_case_outcome_assignments_case_id
  ON case_outcome_assignments(case_id);

CREATE INDEX IF NOT EXISTS idx_case_outcome_assignments_primary
  ON case_outcome_assignments(case_id, is_primary DESC, sort_order ASC, created_at ASC);

INSERT INTO case_type_assignments (
    case_id,
    case_type_id,
    sort_order,
    is_primary,
    created_at,
    updated_at,
    created_by,
    modified_by
)
SELECT
    c.id,
    c.case_type_id,
    0,
    true,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.modified_by
FROM cases c
WHERE c.case_type_id IS NOT NULL
ON CONFLICT (case_id, case_type_id) DO NOTHING;

INSERT INTO case_outcome_assignments (
    case_id,
    outcome_value,
    sort_order,
    is_primary,
    created_at,
    updated_at,
    created_by,
    modified_by
)
SELECT
    c.id,
    c.outcome,
    0,
    true,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.modified_by
FROM cases c
WHERE c.outcome IS NOT NULL AND btrim(c.outcome) <> ''
ON CONFLICT (case_id, outcome_value) DO NOTHING;

