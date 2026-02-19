-- Migration: Outcomes Tracking for Case Interactions
-- Created: 2026-02-19
-- Description: Add configurable outcome definitions and interaction outcome impacts for case notes

-- ============================================================================
-- OUTCOME_DEFINITIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS outcome_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_reportable BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outcome_definitions_active ON outcome_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_outcome_definitions_reportable ON outcome_definitions(is_reportable);
CREATE INDEX IF NOT EXISTS idx_outcome_definitions_sort ON outcome_definitions(sort_order, name);

CREATE TRIGGER update_outcome_definitions_updated_at
    BEFORE UPDATE ON outcome_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INTERACTION_OUTCOME_IMPACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS interaction_outcome_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interaction_id UUID NOT NULL REFERENCES case_notes(id) ON DELETE CASCADE,
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

    CONSTRAINT interaction_outcome_impacts_unique UNIQUE(interaction_id, outcome_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_interaction_outcome_impacts_interaction
    ON interaction_outcome_impacts(interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_outcome_impacts_outcome
    ON interaction_outcome_impacts(outcome_definition_id);
CREATE INDEX IF NOT EXISTS idx_interaction_outcome_impacts_created_at
    ON interaction_outcome_impacts(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_outcome_impacts_impact_true
    ON interaction_outcome_impacts(outcome_definition_id, interaction_id, created_at)
    WHERE impact = true;

CREATE TRIGGER update_interaction_outcome_impacts_updated_at
    BEFORE UPDATE ON interaction_outcome_impacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

INSERT INTO permissions (name, resource, action, description)
VALUES
    ('outcomes.manage', 'outcomes', 'manage', 'Manage outcome definitions and ordering'),
    ('outcomes.viewReports', 'outcomes', 'view_reports', 'View outcomes reporting'),
    ('outcomes.tagInteraction', 'outcomes', 'tag_interaction', 'Tag interaction outcomes')
ON CONFLICT (name) DO NOTHING;

-- Admin gets all outcome permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('outcomes.manage', 'outcomes.viewReports', 'outcomes.tagInteraction')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager gets reporting + tagging
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('outcomes.viewReports', 'outcomes.tagInteraction')
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Staff gets tagging
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'outcomes.tagInteraction'
WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DEFAULT OUTCOME DEFINITIONS (IDEMPOTENT)
-- ============================================================================

INSERT INTO outcome_definitions (key, name, description, category, is_active, is_reportable, sort_order)
VALUES
    (
        'reduced_criminal_justice_involvement',
        'Reduced criminal justice involvement',
        'Interaction contributed to reduced involvement with the criminal justice system',
        'justice',
        true,
        true,
        10
    ),
    (
        'reduced_health_system_involvement',
        'Reduced health system involvement',
        'Interaction contributed to reduced involvement with emergency or acute health systems',
        'health',
        true,
        true,
        20
    ),
    (
        'obtained_employment',
        'Obtained employment',
        'Interaction contributed to obtaining employment',
        'employment',
        true,
        true,
        30
    ),
    (
        'maintained_employment',
        'Maintained employment',
        'Interaction contributed to maintaining employment',
        'employment',
        true,
        true,
        40
    ),
    (
        'indigenous_community_activities_events',
        'Activities/events with Indigenous communities',
        'Interaction contributed to participation in Indigenous community activities or events',
        'community',
        true,
        true,
        50
    )
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    is_reportable = EXCLUDED.is_reportable,
    sort_order = EXCLUDED.sort_order,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE outcome_definitions IS 'Configurable outcomes used for interaction impact tracking';
COMMENT ON TABLE interaction_outcome_impacts IS 'Outcome impact tags for case note interactions';
COMMENT ON COLUMN interaction_outcome_impacts.attribution IS 'Strength of attribution: DIRECT, LIKELY, POSSIBLE';
COMMENT ON COLUMN interaction_outcome_impacts.intensity IS 'Optional impact intensity score from 1 to 5';
