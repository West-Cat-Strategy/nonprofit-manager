-- Migration: 049_audit_trigger_record_id_fallback.sql
-- Description: Patch audit trigger to support tables without an "id" column.

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_record_json JSONB;
  v_record_id_text TEXT;
  v_record_id UUID;
  v_changed_fields TEXT[];
  v_is_sensitive BOOLEAN := false;
  v_field_name TEXT;
BEGIN
  -- Convert old and new rows to JSONB
  v_old_values := CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END;
  v_new_values := CASE WHEN TG_OP = 'INSERT' THEN row_to_json(NEW) WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END;
  v_record_json := CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE row_to_json(NEW)::jsonb END;

  -- Resolve a stable UUID for audited rows across tables with different PK names.
  v_record_id_text := NULLIF(COALESCE(
    v_record_json->>'id',
    v_record_json->>'user_id',
    v_record_json->>'role_id'
  ), '');

  IF v_record_id_text IS NOT NULL
     AND v_record_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_record_id := v_record_id_text::UUID;
  ELSE
    v_record_id := uuid_generate_v4();
  END IF;

  -- For UPDATE, detect which fields changed
  IF TG_OP = 'UPDATE' THEN
    v_changed_fields := ARRAY[]::TEXT[];
    FOR v_field_name IN
      SELECT key FROM jsonb_object_keys(row_to_json(NEW)::jsonb) AS key
      WHERE row_to_json(NEW)::jsonb->>key IS DISTINCT FROM row_to_json(OLD)::jsonb->>key
    LOOP
      v_changed_fields := array_append(v_changed_fields, v_field_name);
    END LOOP;
  END IF;

  -- Check if any changed fields are sensitive
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    v_is_sensitive := EXISTS (
      SELECT 1 FROM audit_sensitive_fields
      WHERE table_name = TG_TABLE_NAME
      LIMIT 1
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_is_sensitive := EXISTS (
      SELECT 1 FROM audit_sensitive_fields asf
      WHERE asf.table_name = TG_TABLE_NAME
      AND asf.field_name = ANY(v_changed_fields)
    );
  END IF;

  -- Insert audit record
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    old_values,
    new_values,
    changed_fields,
    changed_by,
    client_ip_address,
    user_agent,
    request_id,
    query_text,
    is_sensitive,
    environment
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP::VARCHAR(10),
    v_old_values,
    v_new_values,
    v_changed_fields,
    (current_setting('app.current_user_id', true)::UUID),
    (current_setting('app.client_ip', true)::INET),
    current_setting('app.user_agent', true),
    current_setting('app.request_id', true),
    current_query(),
    v_is_sensitive,
    COALESCE(current_setting('app.environment', true), 'production')
  );

  -- Return appropriate row based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
