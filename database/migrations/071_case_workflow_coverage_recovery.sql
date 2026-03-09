-- Migration 071: CRM + case workflow coverage recovery
-- Created: 2026-03-08
-- Description: Adds provenance/source linkage, workflow-stage coverage, case-linked attendance,
-- and widened lifecycle entity support for follow-ups/activity tracking.

-- ---------------------------------------------------------------------------
-- Case notes provenance
-- ---------------------------------------------------------------------------
ALTER TABLE case_notes
  ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_case_notes_source_entity
  ON case_notes(source_entity_type, source_entity_id)
  WHERE source_entity_type IS NOT NULL
    AND source_entity_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Case outcomes provenance + workflow stage
-- ---------------------------------------------------------------------------
ALTER TABLE case_outcomes
  ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_entity_id UUID,
  ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(32);

ALTER TABLE case_outcomes
  DROP CONSTRAINT IF EXISTS case_outcomes_workflow_stage_check;

ALTER TABLE case_outcomes
  ADD CONSTRAINT case_outcomes_workflow_stage_check
  CHECK (
    workflow_stage IS NULL
    OR workflow_stage IN (
      'interaction',
      'conversation',
      'appointment',
      'follow_up',
      'case_status',
      'manual',
      'legacy'
    )
  );

UPDATE case_outcomes
SET
  source_entity_type = COALESCE(source_entity_type, 'case_note'),
  source_entity_id = COALESCE(source_entity_id, source_interaction_id)
WHERE source_interaction_id IS NOT NULL;

UPDATE case_outcomes
SET workflow_stage = CASE
  WHEN source_interaction_id IS NOT NULL THEN 'interaction'
  WHEN entry_source = 'legacy' THEN 'legacy'
  ELSE 'manual'
END
WHERE workflow_stage IS NULL;

ALTER TABLE case_outcomes
  ALTER COLUMN workflow_stage SET DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_case_outcomes_source_entity
  ON case_outcomes(source_entity_type, source_entity_id)
  WHERE source_entity_type IS NOT NULL
    AND source_entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_case_outcomes_workflow_stage
  ON case_outcomes(workflow_stage, created_at DESC);

-- ---------------------------------------------------------------------------
-- Follow-ups: widen entity scope to contacts
-- ---------------------------------------------------------------------------
ALTER TABLE follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_entity_type_check;

ALTER TABLE follow_ups
  ADD CONSTRAINT follow_ups_entity_type_check
  CHECK (entity_type IN ('case', 'task', 'contact'));

COMMENT ON TABLE follow_ups IS 'Scheduled follow-up lifecycle records for cases, tasks, and contacts';

-- ---------------------------------------------------------------------------
-- Event registrations: optional case linkage for case-context attendance
-- ---------------------------------------------------------------------------
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_registrations_case_created
  ON event_registrations(case_id, created_at DESC)
  WHERE case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_registrations_case_checkin
  ON event_registrations(case_id, check_in_time DESC)
  WHERE case_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Activity events: widen entity types for unified lifecycle feeds
-- ---------------------------------------------------------------------------
ALTER TABLE activity_events
  DROP CONSTRAINT IF EXISTS activity_events_entity_type_check;

ALTER TABLE activity_events
  ADD CONSTRAINT activity_events_entity_type_check
  CHECK (
    entity_type IN (
      'case',
      'donation',
      'volunteer',
      'event',
      'contact',
      'task',
      'appointment',
      'follow_up',
      'conversation',
      'attendance'
    )
  );
