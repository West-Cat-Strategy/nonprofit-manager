-- Migration 116: typed fund designations for donations and recurring plans
-- Adds organization-scoped designation records while preserving legacy text labels.

CREATE TABLE IF NOT EXISTS fund_designations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  restriction_type VARCHAR(40) NOT NULL DEFAULT 'unrestricted',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fund_designations_restriction_type_check CHECK (
    restriction_type IN (
      'unrestricted',
      'temporarily_restricted',
      'permanently_restricted',
      'board_designated'
    )
  ),
  CONSTRAINT fund_designations_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT fund_designations_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fund_designations_org_code_lower
  ON fund_designations(organization_id, lower(code));

CREATE UNIQUE INDEX IF NOT EXISTS uq_fund_designations_org_name_lower
  ON fund_designations(organization_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_fund_designations_org_active
  ON fund_designations(organization_id, is_active, name);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_fund_designations_updated_at'
  ) THEN
    CREATE TRIGGER update_fund_designations_updated_at
      BEFORE UPDATE ON fund_designations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES fund_designations(id) ON DELETE SET NULL;

ALTER TABLE recurring_donation_plans
  ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES fund_designations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_donations_designation_id
  ON donations(designation_id, donation_date DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_donation_plans_designation_id
  ON recurring_donation_plans(designation_id, created_at DESC);

WITH donation_designations AS (
  SELECT DISTINCT
    COALESCE(d.account_id, c.account_id) AS organization_id,
    btrim(d.designation) AS name
  FROM donations d
  LEFT JOIN contacts c ON c.id = d.contact_id
  WHERE d.designation IS NOT NULL
    AND btrim(d.designation) <> ''
    AND COALESCE(d.account_id, c.account_id) IS NOT NULL
),
recurring_designations AS (
  SELECT DISTINCT
    rdp.organization_id,
    btrim(rdp.designation) AS name
  FROM recurring_donation_plans rdp
  WHERE rdp.designation IS NOT NULL
    AND btrim(rdp.designation) <> ''
    AND rdp.organization_id IS NOT NULL
),
all_designations AS (
  SELECT organization_id, name FROM donation_designations
  UNION
  SELECT organization_id, name FROM recurring_designations
)
INSERT INTO fund_designations (organization_id, code, name)
SELECT
  organization_id,
  concat(
    COALESCE(
      NULLIF(
        lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
        ''
      ),
      'designation'
    ),
    '-',
    substr(md5(name), 1, 8)
  ),
  name
FROM all_designations
ON CONFLICT DO NOTHING;

UPDATE donations d
SET designation_id = fd.id
FROM contacts c,
     fund_designations fd
WHERE d.contact_id = c.id
  AND fd.organization_id = COALESCE(d.account_id, c.account_id)
  AND lower(fd.name) = lower(btrim(d.designation))
  AND d.designation_id IS NULL
  AND d.designation IS NOT NULL
  AND btrim(d.designation) <> '';

UPDATE donations d
SET designation_id = fd.id
FROM fund_designations fd
WHERE fd.organization_id = d.account_id
  AND lower(fd.name) = lower(btrim(d.designation))
  AND d.designation_id IS NULL
  AND d.designation IS NOT NULL
  AND btrim(d.designation) <> '';

UPDATE recurring_donation_plans rdp
SET designation_id = fd.id
FROM fund_designations fd
WHERE fd.organization_id = rdp.organization_id
  AND lower(fd.name) = lower(btrim(rdp.designation))
  AND rdp.designation_id IS NULL
  AND rdp.designation IS NOT NULL
  AND btrim(rdp.designation) <> '';

COMMENT ON TABLE fund_designations IS
  'Organization-scoped typed donation designations and restriction categories.';
COMMENT ON COLUMN donations.designation IS
  'Legacy display fallback; new writes should pair this label with donations.designation_id.';
COMMENT ON COLUMN recurring_donation_plans.designation IS
  'Legacy display fallback; new writes should pair this label with recurring_donation_plans.designation_id.';
