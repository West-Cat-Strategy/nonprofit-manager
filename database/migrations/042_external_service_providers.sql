-- Migration: External Service Providers
-- Created: 2026-02-17
-- Description: Normalize external providers and link them to case services

CREATE TABLE IF NOT EXISTS external_service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(100), -- social_worker, legal, medical, massage, counselling, chiropractic, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_service_providers_name_ci
    ON external_service_providers ((LOWER(BTRIM(provider_name))));

CREATE INDEX IF NOT EXISTS idx_external_service_providers_type
    ON external_service_providers(provider_type);

CREATE INDEX IF NOT EXISTS idx_external_service_providers_active
    ON external_service_providers(is_active);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'case_services'
          AND column_name = 'external_service_provider_id'
    ) THEN
        ALTER TABLE case_services
            ADD COLUMN external_service_provider_id UUID REFERENCES external_service_providers(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_case_services_external_provider
    ON case_services(external_service_provider_id);

-- Backfill providers from existing case service text values
INSERT INTO external_service_providers (provider_name, provider_type)
SELECT DISTINCT
    BTRIM(cs.service_provider) AS provider_name,
    NULLIF(BTRIM(cs.service_type), '') AS provider_type
FROM case_services cs
WHERE cs.service_provider IS NOT NULL
  AND BTRIM(cs.service_provider) <> ''
ON CONFLICT ((LOWER(BTRIM(provider_name)))) DO NOTHING;

-- Attach matching provider ids to existing case service rows
UPDATE case_services cs
SET external_service_provider_id = esp.id
FROM external_service_providers esp
WHERE cs.service_provider IS NOT NULL
  AND BTRIM(cs.service_provider) <> ''
  AND cs.external_service_provider_id IS NULL
  AND LOWER(BTRIM(cs.service_provider)) = LOWER(BTRIM(esp.provider_name));

-- Normalize provider names on case services to the canonical provider name
UPDATE case_services cs
SET service_provider = esp.provider_name
FROM external_service_providers esp
WHERE cs.external_service_provider_id = esp.id
  AND cs.service_provider IS DISTINCT FROM esp.provider_name;

DROP TRIGGER IF EXISTS update_external_service_providers_updated_at ON external_service_providers;
CREATE TRIGGER update_external_service_providers_updated_at
    BEFORE UPDATE ON external_service_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE external_service_providers IS 'Reusable directory of external service providers attached to case services';
COMMENT ON COLUMN case_services.external_service_provider_id IS 'Reference to normalized external service provider record';
