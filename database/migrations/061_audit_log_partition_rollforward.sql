-- Ensure audit_log partitioning keeps working beyond the initial 2026-01/2026-02 bootstrap.
-- This migration creates a rolling set of monthly partitions around the current date
-- and a default partition as a final safety net for out-of-range writes.

DO $$
DECLARE
  start_month DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '12 months')::DATE;
  end_month DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '24 months')::DATE;
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
END
$$;

DO $$
BEGIN
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
END
$$;
