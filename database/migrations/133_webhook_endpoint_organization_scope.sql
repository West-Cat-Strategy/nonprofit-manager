-- Migration 133: Webhook endpoint organization scope
-- Created: 2026-05-15
-- Description:
--   Adds organization ownership to outbound webhook endpoints while preserving
--   user_id as creator metadata. Legacy endpoints are backfilled only when the
--   creator has one unambiguous active organization.

ALTER TABLE webhook_endpoints
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

WITH endpoint_org_resolution AS (
  SELECT
    we.id AS endpoint_id,
    (ARRAY_AGG(DISTINCT uaa.account_id))[1] AS organization_id
  FROM webhook_endpoints we
  JOIN user_account_access uaa
    ON uaa.user_id = we.user_id
   AND uaa.is_active = TRUE
  WHERE we.organization_id IS NULL
  GROUP BY we.id
  HAVING COUNT(DISTINCT uaa.account_id) = 1
)
UPDATE webhook_endpoints we
SET organization_id = resolved.organization_id
FROM endpoint_org_resolution resolved
WHERE we.id = resolved.endpoint_id
  AND we.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org_active
  ON webhook_endpoints(organization_id, is_active)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_org_active_events_gin
  ON webhook_endpoints USING gin(events)
  WHERE organization_id IS NOT NULL AND is_active = TRUE;
