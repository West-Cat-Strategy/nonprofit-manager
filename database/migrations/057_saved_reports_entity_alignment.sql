-- Migration 057: Align saved_reports.entity with canonical report entities

ALTER TABLE saved_reports
  DROP CONSTRAINT IF EXISTS saved_reports_entity_check;

ALTER TABLE saved_reports
  ADD CONSTRAINT saved_reports_entity_check
  CHECK (
    entity IN (
      'accounts',
      'contacts',
      'donations',
      'events',
      'volunteers',
      'tasks',
      'cases',
      'opportunities',
      'expenses',
      'grants',
      'programs'
    )
  );
