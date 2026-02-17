-- Migration: PostgreSQL Audit Logging
-- Phase 3: Compliance & Audit Trail
-- 
-- Implements comprehensive audit logging for all data modifications.
-- Captures: what changed, who changed it, when, and full before/after state.

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================

CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4(),
  
  -- What was changed
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
  
  -- Record state
  old_values JSONB, -- Full row before change (for UPDATE/DELETE)
  new_values JSONB, -- Full row after change (for INSERT/UPDATE)
  changed_fields TEXT[], -- Array of field names that changed (for UPDATE only)
  
  -- Who changed it
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- Session ID from JWT
  
  -- When and where
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  client_ip_address INET,
  user_agent TEXT,
  
  -- Environment
  environment VARCHAR(50) DEFAULT 'production', -- development, staging, production
  request_id VARCHAR(255), -- Correlation ID from X-Request-ID header
  
  -- Query information (for system debugging)
  query_text TEXT, -- The actual SQL that triggered the change
  
  -- Metadata
  is_sensitive BOOLEAN DEFAULT false, -- Was PII modified?
  change_reason VARCHAR(255), -- Why the change was made (e.g., "User request", "Admin enforcement")
  
  -- Indexing and search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_log_table_record 
  ON audit_log(table_name, record_id, changed_at DESC);

CREATE INDEX idx_audit_log_user 
  ON audit_log(changed_by, changed_at DESC);

CREATE INDEX idx_audit_log_timestamp 
  ON audit_log(changed_at DESC);

CREATE INDEX idx_audit_log_operation 
  ON audit_log(operation);

CREATE INDEX idx_audit_log_sensitive 
  ON audit_log(is_sensitive, changed_at DESC) WHERE is_sensitive = true;

-- Create index for searching by request_id (tracing)
CREATE INDEX idx_audit_log_request_id 
  ON audit_log(request_id);

-- Partition audit_log by month for better performance on large datasets
-- This prevents the table from becoming too large
CREATE TABLE audit_log_202601 PARTITION OF audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_log_202602 PARTITION OF audit_log
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Old partitions can be archived or deleted after retention period

-- ============================================================
-- SENSITIVE TABLES FOR AUDIT LOGGING
-- ============================================================

-- Define which fields should trigger "is_sensitive" flag
CREATE TABLE audit_sensitive_fields (
  table_name VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (table_name, field_name)
);

INSERT INTO audit_sensitive_fields (table_name, field_name) VALUES
  -- Contact PII
  ('contacts', 'phone'),
  ('contacts', 'mobile_phone'),
  ('contacts', 'birth_date'),
  ('contacts', 'email'),
  
  -- Account PII
  ('accounts', 'phone'),
  ('accounts', 'email'),
  
  -- Volunteer sensitive info
  ('volunteers', 'emergency_contact_phone'),
  ('volunteers', 'background_check_status'),
  
  -- Donations
  ('donations', 'payment_method'),
  ('donations', 'transaction_id'),
  ('donations', 'donor_notes'),
  
  -- User sensitive fields
  ('users', 'password_hash'),
  ('users', 'email'),
  ('users', 'phone');

-- ============================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old_values JSONB;
  v_new_values JSONB;
  v_changed_fields TEXT[];
  v_is_sensitive BOOLEAN := false;
  v_field_name TEXT;
BEGIN
  -- Convert old and new rows to JSONB
  v_old_values := CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END;
  v_new_values := CASE WHEN TG_OP = 'INSERT' THEN row_to_json(NEW) WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END;
  
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
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
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

-- ============================================================
-- AUDIT TRIGGERS ON SENSITIVE TABLES
-- ============================================================

-- Contacts
CREATE TRIGGER contacts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Donations
CREATE TRIGGER donations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Accounts
CREATE TRIGGER accounts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Volunteers
CREATE TRIGGER volunteers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON volunteers
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Events
CREATE TRIGGER events_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Users
CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- User Roles (important for access control)
CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Roles (important for access control)
CREATE TRIGGER roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- ============================================================
-- AUDIT LOG RETENTION POLICY
-- ============================================================

-- Function to archive old audit logs (for GDPR "deletion" compliance)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(days_old INTEGER DEFAULT 365)
RETURNS TABLE(archived_count BIGINT) AS $$
DECLARE
  v_archived_count BIGINT;
BEGIN
  -- In production, export to separate archive table/system before deleting
  UPDATE audit_log
  SET is_active = false
  WHERE changed_at < NOW() - (days_old || ' days')::INTERVAL
  AND is_active = true;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule archive job (run daily, usually at midnight)
-- psql nonprofit_manager -c "SELECT archive_old_audit_logs(365);"

-- ============================================================
-- AUDIT LOG VIEWS FOR EASY QUERYING
-- ============================================================

-- View: Recent changes to a specific record
CREATE VIEW audit_record_history AS
SELECT
  al.changed_at,
  al.operation,
  u.email AS changed_by_email,
  al.old_values,
  al.new_values,
  al.changed_fields,
  al.request_id,
  al.is_sensitive
FROM audit_log al
LEFT JOIN users u ON al.changed_by = u.id
ORDER BY al.changed_at DESC;

-- View: Sensitive data changes
CREATE VIEW audit_sensitive_changes AS
SELECT
  al.table_name,
  al.record_id,
  al.changed_at,
  al.operation,
  u.email AS changed_by_email,
  al.request_id,
  al.client_ip_address,
  al.changed_fields
FROM audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.is_sensitive = true
ORDER BY al.changed_at DESC;

-- View: User activity summary
CREATE VIEW audit_user_activity AS
SELECT
  changed_by,
  u.email,
  COUNT(*) as total_changes,
  COUNT(CASE WHEN is_sensitive THEN 1 END) as sensitive_changes,
  COUNT(DISTINCT table_name) as tables_modified,
  MAX(changed_at) as last_activity
FROM audit_log al
LEFT JOIN users u ON al.changed_by = u.id
GROUP BY changed_by, u.email
ORDER BY max(changed_at) DESC;

-- ============================================================
-- AUDIT LOG QUERIES FOR COMMON TASKS
-- ============================================================

-- Query: Find all changes to a specific contact
-- SELECT * FROM audit_log 
-- WHERE table_name = 'contacts' AND record_id = '550e8400-e29b-41d4-a716-446655440000'
-- ORDER BY changed_at DESC;

-- Query: Find all PII access in last 24 hours
-- SELECT * FROM audit_sensitive_changes
-- WHERE changed_at > NOW() - INTERVAL '24 hours'
-- ORDER BY changed_at DESC;

-- Query: Find changes by specific user
-- SELECT * FROM audit_log 
-- WHERE changed_by = (SELECT id FROM users WHERE email = 'user@example.com')
-- ORDER BY changed_at DESC;

-- Query: Find all deletions (potential data loss)
-- SELECT * FROM audit_log
-- WHERE operation = 'DELETE'
-- ORDER BY changed_at DESC LIMIT 100;

-- ============================================================
-- SECURITY NOTES
-- ============================================================

/*
GDPR Compliance:
- Audit logs contain PII (old_values, new_values)
- Right to be forgotten: Set changed_by = NULL for user's records
- Data retention: Archive logs after 1 year, delete after 7 years

Data Integrity:
- Audit logs should be append-only (no DELETEs except via retention policy)
- Consider database triggers to prevent manual audit_log modifications
- Export to immutable storage (S3, GCS) for compliance

Performance:
- Partitioning by month prevents table bloat
- Indexes optimize query performance
- Archive old records to separate table

Access Control:
- Restrict audit_log SELECT to administrators and security team
- Use views (audit_record_history, audit_sensitive_changes) for limited access
- Log access to audit_log itself (meta-audit)
*/
