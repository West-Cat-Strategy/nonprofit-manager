-- Migration 076: Contact note outcome tracking
-- Created: 2026-03-14
-- Description: Adds case-linked outcome tagging for contact notes and sync-safe case outcome indexes.

CREATE TABLE IF NOT EXISTS contact_note_outcome_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES contact_notes(id) ON DELETE CASCADE,
    outcome_definition_id UUID NOT NULL REFERENCES outcome_definitions(id) ON DELETE RESTRICT,
    impact BOOLEAN DEFAULT true,
    attribution VARCHAR(20) NOT NULL DEFAULT 'DIRECT'
        CHECK (attribution IN ('DIRECT', 'LIKELY', 'POSSIBLE')),
    intensity SMALLINT
        CHECK (intensity IS NULL OR intensity BETWEEN 1 AND 5),
    evidence_note TEXT
        CHECK (evidence_note IS NULL OR char_length(evidence_note) <= 2000),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT contact_note_outcome_impacts_unique UNIQUE(interaction_id, outcome_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_note_outcome_impacts_interaction
    ON contact_note_outcome_impacts(interaction_id);
CREATE INDEX IF NOT EXISTS idx_contact_note_outcome_impacts_outcome
    ON contact_note_outcome_impacts(outcome_definition_id);
CREATE INDEX IF NOT EXISTS idx_contact_note_outcome_impacts_created_at
    ON contact_note_outcome_impacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_note_outcome_impacts_impact_true
    ON contact_note_outcome_impacts(outcome_definition_id, interaction_id, created_at)
    WHERE impact = true;

CREATE TRIGGER update_contact_note_outcome_impacts_updated_at
    BEFORE UPDATE ON contact_note_outcome_impacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_outcomes_contact_note_sync_unique
    ON case_outcomes(source_entity_id, outcome_definition_id)
    WHERE source_entity_type = 'contact_note'
      AND source_entity_id IS NOT NULL
      AND outcome_definition_id IS NOT NULL
      AND entry_source = 'interaction_sync';

COMMENT ON TABLE contact_note_outcome_impacts IS 'Outcome impact tags for case-linked contact notes';
