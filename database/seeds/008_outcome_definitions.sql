-- Seed default outcome definitions (idempotent)

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
