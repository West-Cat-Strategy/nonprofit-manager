-- Migration 063: Case outcomes dual-model alignment
-- Created: 2026-03-03
-- Description: Adds definition/source linkage columns for case outcome events and backfills legacy rows.

ALTER TABLE case_outcomes
  ADD COLUMN IF NOT EXISTS outcome_definition_id UUID REFERENCES outcome_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_interaction_id UUID REFERENCES case_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_source VARCHAR(32);

ALTER TABLE case_outcomes
  DROP CONSTRAINT IF EXISTS case_outcomes_entry_source_check;

ALTER TABLE case_outcomes
  ADD CONSTRAINT case_outcomes_entry_source_check
  CHECK (
    entry_source IS NULL
    OR entry_source IN ('manual', 'interaction_sync', 'legacy')
  );

ALTER TABLE case_outcomes
  ALTER COLUMN entry_source SET DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_case_outcomes_outcome_definition_id
  ON case_outcomes(outcome_definition_id);

CREATE INDEX IF NOT EXISTS idx_case_outcomes_source_interaction_id
  ON case_outcomes(source_interaction_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_outcomes_sync_unique
  ON case_outcomes(source_interaction_id, outcome_definition_id)
  WHERE source_interaction_id IS NOT NULL
    AND outcome_definition_id IS NOT NULL;

WITH definition_candidates AS (
  SELECT
    od.id,
    regexp_replace(lower(trim(od.key)), '[^a-z0-9]+', '_', 'g') AS normalized_key,
    regexp_replace(lower(trim(od.name)), '[^a-z0-9]+', ' ', 'g') AS normalized_name,
    row_number() OVER (
      PARTITION BY regexp_replace(lower(trim(od.name)), '[^a-z0-9]+', ' ', 'g')
      ORDER BY od.sort_order ASC, od.id ASC
    ) AS normalized_name_rank
  FROM outcome_definitions od
)
UPDATE case_outcomes co
SET outcome_definition_id = dc.id
FROM definition_candidates dc
WHERE co.outcome_definition_id IS NULL
  AND co.outcome_type IS NOT NULL
  AND regexp_replace(lower(trim(co.outcome_type)), '[^a-z0-9]+', '_', 'g') = dc.normalized_key;

WITH definition_candidates AS (
  SELECT
    od.id,
    regexp_replace(lower(trim(od.name)), '[^a-z0-9]+', ' ', 'g') AS normalized_name,
    row_number() OVER (
      PARTITION BY regexp_replace(lower(trim(od.name)), '[^a-z0-9]+', ' ', 'g')
      ORDER BY od.sort_order ASC, od.id ASC
    ) AS normalized_name_rank
  FROM outcome_definitions od
)
UPDATE case_outcomes co
SET outcome_definition_id = dc.id
FROM definition_candidates dc
WHERE co.outcome_definition_id IS NULL
  AND co.outcome_type IS NOT NULL
  AND dc.normalized_name_rank = 1
  AND regexp_replace(lower(trim(co.outcome_type)), '[^a-z0-9]+', ' ', 'g') = dc.normalized_name;

UPDATE case_outcomes
SET entry_source = 'legacy'
WHERE entry_source IS NULL;

UPDATE case_outcomes co
SET outcome_type = od.name
FROM outcome_definitions od
WHERE co.outcome_definition_id = od.id
  AND (co.outcome_type IS NULL OR btrim(co.outcome_type) = '');
