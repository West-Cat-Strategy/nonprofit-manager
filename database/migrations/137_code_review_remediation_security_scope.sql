-- Code-review remediation: alert organization scope and donation delete RLS.

ALTER TABLE alert_configs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

WITH resolved_alert_org AS (
  SELECT
    ac.id AS alert_config_id,
    COALESCE(
      (
        SELECT uaa.account_id
        FROM user_account_access uaa
        WHERE uaa.user_id = ac.user_id
          AND uaa.is_active = true
        ORDER BY
          CASE uaa.access_level
            WHEN 'admin' THEN 0
            WHEN 'editor' THEN 1
            ELSE 2
          END,
          uaa.granted_at ASC,
          uaa.id ASC
        LIMIT 1
      ),
      (
        SELECT a.id
        FROM accounts a
        WHERE a.account_type = 'organization'
        ORDER BY a.created_at ASC NULLS LAST, a.id ASC
        LIMIT 1
      )
    ) AS organization_id
  FROM alert_configs ac
  WHERE ac.organization_id IS NULL
)
UPDATE alert_configs ac
SET organization_id = resolved.organization_id
FROM resolved_alert_org resolved
WHERE ac.id = resolved.alert_config_id
  AND ac.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM alert_configs WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill organization_id for every alert config';
  END IF;
END
$$;

ALTER TABLE alert_configs
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE alert_instances
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE alert_instances ai
SET organization_id = ac.organization_id
FROM alert_configs ac
WHERE ac.id = ai.alert_config_id
  AND ai.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM alert_instances WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill organization_id for every alert instance';
  END IF;
END
$$;

ALTER TABLE alert_instances
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alert_configs_org_user_created
  ON alert_configs(organization_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_instances_org_status_triggered
  ON alert_instances(organization_id, status, triggered_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_configs_metric_type_check'
  ) THEN
    ALTER TABLE alert_configs
      ADD CONSTRAINT alert_configs_metric_type_check
      CHECK (metric_type IN (
        'donations',
        'donation_amount',
        'volunteer_hours',
        'event_attendance',
        'case_volume',
        'engagement_score'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_configs_condition_check'
  ) THEN
    ALTER TABLE alert_configs
      ADD CONSTRAINT alert_configs_condition_check
      CHECK (condition IN (
        'exceeds',
        'drops_below',
        'changes_by',
        'anomaly_detected',
        'trend_reversal'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_configs_frequency_check'
  ) THEN
    ALTER TABLE alert_configs
      ADD CONSTRAINT alert_configs_frequency_check
      CHECK (frequency IN ('real_time', 'daily', 'weekly', 'monthly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_configs_severity_check'
  ) THEN
    ALTER TABLE alert_configs
      ADD CONSTRAINT alert_configs_severity_check
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_configs_channels_array_check'
  ) THEN
    ALTER TABLE alert_configs
      ADD CONSTRAINT alert_configs_channels_array_check
      CHECK (
        jsonb_typeof(channels) = 'array'
        AND channels <@ '["email", "in_app", "slack", "webhook"]'::jsonb
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_configs_recipients_array_check'
  ) THEN
    ALTER TABLE alert_configs
      ADD CONSTRAINT alert_configs_recipients_array_check
      CHECK (recipients IS NULL OR jsonb_typeof(recipients) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_instances_status_check'
  ) THEN
    ALTER TABLE alert_instances
      ADD CONSTRAINT alert_instances_status_check
      CHECK (status IN ('triggered', 'resolved'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION sync_alert_instance_organization_id() RETURNS TRIGGER AS $$
DECLARE
  resolved_organization_id UUID;
BEGIN
  SELECT organization_id
  INTO resolved_organization_id
  FROM alert_configs
  WHERE id = NEW.alert_config_id;

  IF resolved_organization_id IS NULL THEN
    RAISE EXCEPTION 'Alert instance must reference an alert config with organization scope';
  END IF;

  NEW.organization_id := resolved_organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_alert_instance_organization_id ON alert_instances;
CREATE TRIGGER set_alert_instance_organization_id
  BEFORE INSERT OR UPDATE OF alert_config_id, organization_id ON alert_instances
  FOR EACH ROW
  EXECUTE FUNCTION sync_alert_instance_organization_id();

DROP POLICY IF EXISTS donations_delete_policy ON donations;
CREATE POLICY donations_delete_policy ON donations
  FOR DELETE
  USING (
    is_admin()
    OR can_edit_account(
      COALESCE(
        account_id,
        (SELECT c.account_id FROM contacts c WHERE c.id = donations.contact_id)
      )
    )
  );
