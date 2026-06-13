SELECT set_config('app.current_user_id', :'fixture_user_id', false) AS current_user_id
\gset

WITH inserted_instance AS (
  INSERT INTO alert_instances (
    id,
    alert_config_id,
    alert_name,
    metric_type,
    condition,
    severity,
    current_value,
    threshold_value,
    message,
    organization_id
  )
  VALUES (
    :'alert_instance_id',
    :'alert_config_id',
    'Migration verification alert scope',
    'donations',
    'exceeds',
    'medium',
    125,
    100,
    'Migration verification alert instance',
    :'fixture_admin_write_account_id'
  )
  RETURNING id, organization_id
)
SELECT COUNT(*)
FROM inserted_instance
WHERE id = :'alert_instance_id'::uuid
  AND organization_id = :'fixture_account_id'::uuid;

WITH deleted_donation AS (
  DELETE FROM donations
  WHERE id = :'donation_id'::uuid
  RETURNING id
)
SELECT COUNT(*)
FROM deleted_donation;

SELECT COUNT(*)
FROM alert_configs
WHERE organization_id IS NULL;

SELECT COUNT(*)
FROM alert_instances
WHERE organization_id IS NULL;
