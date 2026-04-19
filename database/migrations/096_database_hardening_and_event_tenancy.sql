-- Migration 096: database hardening, app-role grants, and event tenancy cleanup
-- Created: 2026-04-18
-- Description:
--   * removes unused schema_migrations checksum bookkeeping
--   * provisions/grants the local non-superuser app role when possible
--   * adds organization ownership to events + event_occurrences
--   * enforces event/event_occurrence/event_registration RLS by organization
--   * prunes superseded indexes and replaces follow-up schedule indexes
--   * replaces one-shot audit partition rollforward with a repeatable function

ALTER TABLE schema_migrations
  DROP COLUMN IF EXISTS checksum;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'nonprofit_app_user'
  ) THEN
    BEGIN
      EXECUTE format(
        'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
        'nonprofit_app_user',
        'nonprofit_app_password'
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping local app-role creation because the current DB user lacks role-management privileges';
    END;
  END IF;
END
$$;

DO $$
DECLARE
  target_role TEXT;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['nonprofit_app_user', 'nonprofit_app_user_prod']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = target_role
    ) THEN
      EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), target_role);
      EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', target_role);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', target_role);
      EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', target_role);
      EXECUTE format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO %I', target_role);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
        target_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
        target_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I',
        target_role
      );
    END IF;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION can_access_account(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_account_access uaa
    WHERE uaa.account_id = can_access_account.account_id
      AND uaa.user_id = get_current_user_id()
      AND uaa.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION can_edit_account(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_account_access uaa
    WHERE uaa.account_id = can_edit_account.account_id
      AND uaa.user_id = get_current_user_id()
      AND uaa.access_level IN ('admin', 'editor')
      AND uaa.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION can_administer_account(account_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF is_admin() THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_account_access uaa
    WHERE uaa.account_id = can_administer_account.account_id
      AND uaa.user_id = get_current_user_id()
      AND uaa.access_level = 'admin'
      AND uaa.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE events e
SET organization_id = COALESCE(
  (
    SELECT uaa.account_id
    FROM user_account_access uaa
    WHERE uaa.user_id = e.created_by
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
    ORDER BY a.created_at ASC NULLS LAST, a.id ASC
    LIMIT 1
  )
)
WHERE e.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events
    WHERE organization_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to backfill organization_id for every event';
  END IF;
END
$$;

ALTER TABLE events
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_organization_start_date
  ON events (organization_id, start_date ASC, id);

ALTER TABLE event_occurrences
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE event_occurrences eo
SET organization_id = e.organization_id
FROM events e
WHERE e.id = eo.event_id
  AND eo.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM event_occurrences
    WHERE organization_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to backfill organization_id for every event occurrence';
  END IF;
END
$$;

ALTER TABLE event_occurrences
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_occurrences_org_start
  ON event_occurrences (organization_id, start_date ASC, event_id, sequence_index);

CREATE OR REPLACE FUNCTION sync_event_occurrence_organization_id() RETURNS TRIGGER AS $$
DECLARE
  event_org_id UUID;
BEGIN
  SELECT organization_id
  INTO event_org_id
  FROM events
  WHERE id = NEW.event_id;

  IF event_org_id IS NULL THEN
    RAISE EXCEPTION 'Event % must have an organization before creating occurrences', NEW.event_id;
  END IF;

  NEW.organization_id := event_org_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_event_occurrence_organization_id ON event_occurrences;

CREATE TRIGGER set_event_occurrence_organization_id
  BEFORE INSERT OR UPDATE OF event_id, organization_id ON event_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION sync_event_occurrence_organization_id();

DROP POLICY IF EXISTS events_select_policy ON events;
DROP POLICY IF EXISTS events_org_select_policy ON events;
DROP POLICY IF EXISTS events_org_insert_policy ON events;
DROP POLICY IF EXISTS events_org_update_policy ON events;
DROP POLICY IF EXISTS events_org_delete_policy ON events;

CREATE POLICY events_org_select_policy ON events
  FOR SELECT
  USING (
    is_admin()
    OR is_public = true
    OR can_access_account(organization_id)
  );

CREATE POLICY events_org_insert_policy ON events
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR can_edit_account(organization_id)
  );

CREATE POLICY events_org_update_policy ON events
  FOR UPDATE
  USING (
    is_admin()
    OR can_edit_account(organization_id)
  )
  WITH CHECK (
    is_admin()
    OR can_edit_account(organization_id)
  );

CREATE POLICY events_org_delete_policy ON events
  FOR DELETE
  USING (
    is_admin()
    OR can_administer_account(organization_id)
  );

ALTER TABLE event_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_occurrences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_occurrences_org_select_policy ON event_occurrences;
DROP POLICY IF EXISTS event_occurrences_org_insert_policy ON event_occurrences;
DROP POLICY IF EXISTS event_occurrences_org_update_policy ON event_occurrences;
DROP POLICY IF EXISTS event_occurrences_org_delete_policy ON event_occurrences;

CREATE POLICY event_occurrences_org_select_policy ON event_occurrences
  FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_occurrences.event_id
        AND e.is_public = true
    )
    OR can_access_account(organization_id)
  );

CREATE POLICY event_occurrences_org_insert_policy ON event_occurrences
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR can_edit_account(organization_id)
  );

CREATE POLICY event_occurrences_org_update_policy ON event_occurrences
  FOR UPDATE
  USING (
    is_admin()
    OR can_edit_account(organization_id)
  )
  WITH CHECK (
    is_admin()
    OR can_edit_account(organization_id)
  );

CREATE POLICY event_occurrences_org_delete_policy ON event_occurrences
  FOR DELETE
  USING (
    is_admin()
    OR can_administer_account(organization_id)
  );

DROP INDEX IF EXISTS idx_opportunities_stage;
DROP INDEX IF EXISTS idx_opportunities_status;
DROP INDEX IF EXISTS idx_opportunities_assigned;
DROP INDEX IF EXISTS idx_meeting_agenda_items_meeting;
DROP INDEX IF EXISTS idx_site_analytics_site_id;
DROP INDEX IF EXISTS idx_site_analytics_created_at;
DROP INDEX IF EXISTS idx_site_analytics_event_type;
DROP INDEX IF EXISTS idx_follow_ups_org_schedule;
DROP INDEX IF EXISTS idx_follow_ups_org_entity_schedule;

CREATE INDEX IF NOT EXISTS idx_follow_ups_org_status_schedule
  ON follow_ups (
    organization_id,
    status,
    scheduled_date ASC,
    scheduled_time ASC NULLS LAST,
    created_at DESC
  );

CREATE OR REPLACE FUNCTION ensure_audit_log_partitions(
  months_back INTEGER DEFAULT 12,
  months_forward INTEGER DEFAULT 24
) RETURNS void AS $$
DECLARE
  start_month DATE := (date_trunc('month', CURRENT_DATE) - make_interval(months => months_back))::DATE;
  end_month DATE := (date_trunc('month', CURRENT_DATE) + make_interval(months => months_forward))::DATE;
  partition_start DATE;
  partition_end DATE;
  partition_name TEXT;
BEGIN
  partition_start := start_month;

  WHILE partition_start < end_month LOOP
    partition_end := (partition_start + INTERVAL '1 month')::DATE;
    partition_name := format('audit_log_%s', to_char(partition_start, 'YYYYMM'));

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      partition_start,
      partition_end
    );

    partition_start := partition_end;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relname = 'audit_log_default'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT';
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT ensure_audit_log_partitions(12, 24);
