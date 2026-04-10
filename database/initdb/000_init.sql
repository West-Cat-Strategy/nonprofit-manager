-- Postgres init script for docker-compose.dev.yml
-- Runs migrations (in order), then loads the starter bootstrap data only.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    migration_id TEXT,
    canonical_filename TEXT
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_migration_id
    ON schema_migrations(migration_id);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_canonical_filename
    ON schema_migrations(canonical_filename);

\i /migrations/001_initial_schema.sql
\i /migrations/002_audit_logs.sql
\i /migrations/003_schema_updates.sql
\i /migrations/004_permissions.sql
\i /migrations/005_saved_reports.sql
\i /migrations/006_website_builder.sql
\i /migrations/007_publishing_enhancements.sql
\i /migrations/008_payment_reconciliation.sql
\i /migrations/009_case_management.sql
\i /migrations/010_volunteer_hours.sql
\i /migrations/011_user_preferences.sql
\i /migrations/012_user_profile_fields.sql
\i /migrations/013_user_profile_extended.sql
\i /migrations/014_contact_enhancements.sql
\i /migrations/015_user_invitations.sql
\i /migrations/016_contact_documents.sql
\i /migrations/017_dashboard_configs.sql
\i /migrations/018_contact_roles.sql
\i /migrations/019_client_portal.sql
\i /migrations/020_user_roles_backfill.sql
\i /migrations/021_portal_activity_logs.sql
\i /migrations/022_meeting_manager.sql
\i /migrations/023_mfa_webauthn.sql
\i /migrations/024_organization_branding.sql
\i /migrations/025_theme_presets.sql
\i /migrations/026_data_scopes.sql
\i /migrations/027_contact_alerts_and_address.sql
\i /migrations/028_contact_tags.sql
\i /migrations/029_enforce_mfa_for_roles.sql
\i /migrations/030_api_key_authentication.sql
\i /migrations/031_add_pii_encryption_fields.sql
\i /migrations/032_row_level_security.sql
\i /migrations/033_audit_logging.sql
\i /migrations/034_email_settings_and_password_resets.sql
\i /migrations/035_registration_settings.sql
\i /migrations/036_contact_preferred_name_and_role_updates.sql
\i /migrations/037_contact_roles_client_subtypes_and_contact.sql
\i /migrations/038_contact_roles_rename_caregiver_to_support_person.sql
\i /migrations/039_contact_sms_voicemail_preferences.sql
\i /migrations/040_events_public_visibility.sql
\i /migrations/041_events_recurrence.sql
\i /migrations/042_external_service_providers.sql
\i /migrations/043_alerts.sql
\i /migrations/044_outcomes_tracking.sql
\i /migrations/045_event_reminders_and_twilio_settings.sql
\i /migrations/046_event_reminder_automations.sql
\i /migrations/047_portal_visibility_and_messaging.sql
\i /migrations/048_portal_appointment_slots.sql
\i /migrations/049_audit_trigger_record_id_fallback.sql
\i /migrations/050_case_client_visibility_notes_outcomes_topics_documents.sql
\i /migrations/051_webhook_delivery_queue_hardening.sql
\i /migrations/052_webhook_delivery_and_payment_webhook_idempotency.sql
\i /migrations/053_follow_ups.sql
\i /migrations/054_scheduled_reports.sql
\i /migrations/055_opportunities_pipeline.sql
\i /migrations/056_team_chat_case_threads.sql
\i /migrations/057_saved_reports_entity_alignment.sql
\i /migrations/058_report_templates.sql
\i /migrations/059_saved_report_public_snapshots.sql
\i /migrations/060a_event_checkin_and_appointment_reminders.sql
\i /migrations/060b_saved_reports_sharing_columns.sql
\i /migrations/061_audit_log_partition_rollforward.sql
\i /migrations/062_efficiency_refactor_indexes.sql
\i /migrations/063_case_outcomes_dual_model_alignment.sql
\i /migrations/064_contacts_phn_encrypted.sql
\i /migrations/065_event_public_checkin_settings.sql
\i /migrations/066_website_builder_v2_org_scope.sql
\i /migrations/067_website_site_console_settings.sql
\i /migrations/068_people_import_export_support.sql
\i /migrations/069_public_submission_export_jobs_activity_conversion_events.sql
\i /migrations/070_activity_conversion_event_provenance_backfill.sql
\i /migrations/071_case_workflow_coverage_recovery.sql
\i /migrations/072_volunteer_assignments.sql
\i /migrations/073_contact_method_sync_backfill.sql
\i /migrations/074_email_settings_starttls_defaults.sql
\i /migrations/075_staff_backend_efficiency_search_indexes.sql
\i /migrations/076_contact_note_outcome_tracking.sql
\i /migrations/077_recurring_donation_processing.sql
\i /migrations/078_team_messenger_split.sql
\i /migrations/079_donation_tax_receipts_and_org_settings.sql
\i /migrations/080_social_media_tracking.sql
\i /migrations/081_messaging_client_message_ids.sql
\i /migrations/082_backend_runtime_efficiency_indexes.sql
\i /migrations/083_grants_tracking.sql
\i /migrations/084_imported_import_staging.sql
\i /migrations/085_case_type_and_outcome_assignments.sql
\i /migrations/086_imported_case_contact_org_backfill.sql
\i /migrations/087_newsletter_provider_settings.sql

UPDATE schema_migrations
SET migration_id = '032',
    canonical_filename = '032_row_level_security.sql'
WHERE filename = '032_row_level_security_fixed.sql';

UPDATE schema_migrations
SET migration_id = '060a',
    canonical_filename = '060a_event_checkin_and_appointment_reminders.sql'
WHERE filename = '060_event_checkin_and_appointment_reminders.sql';

UPDATE schema_migrations
SET migration_id = '060b',
    canonical_filename = '060b_saved_reports_sharing_columns.sql'
WHERE filename = '060_saved_reports_sharing_columns.sql';

UPDATE schema_migrations
SET migration_id = '062',
    canonical_filename = '062_efficiency_refactor_indexes.sql'
WHERE filename = '066_efficiency_refactor_indexes.sql';

INSERT INTO schema_migrations (filename, migration_id, canonical_filename)
VALUES
    ('001_initial_schema.sql', '001', '001_initial_schema.sql'),
    ('002_audit_logs.sql', '002', '002_audit_logs.sql'),
    ('003_schema_updates.sql', '003', '003_schema_updates.sql'),
    ('004_permissions.sql', '004', '004_permissions.sql'),
    ('005_saved_reports.sql', '005', '005_saved_reports.sql'),
    ('006_website_builder.sql', '006', '006_website_builder.sql'),
    ('007_publishing_enhancements.sql', '007', '007_publishing_enhancements.sql'),
    ('008_payment_reconciliation.sql', '008', '008_payment_reconciliation.sql'),
    ('009_case_management.sql', '009', '009_case_management.sql'),
    ('010_volunteer_hours.sql', '010', '010_volunteer_hours.sql'),
    ('011_user_preferences.sql', '011', '011_user_preferences.sql'),
    ('012_user_profile_fields.sql', '012', '012_user_profile_fields.sql'),
    ('013_user_profile_extended.sql', '013', '013_user_profile_extended.sql'),
    ('014_contact_enhancements.sql', '014', '014_contact_enhancements.sql'),
    ('015_user_invitations.sql', '015', '015_user_invitations.sql'),
    ('016_contact_documents.sql', '016', '016_contact_documents.sql'),
    ('017_dashboard_configs.sql', '017', '017_dashboard_configs.sql'),
    ('018_contact_roles.sql', '018', '018_contact_roles.sql'),
    ('019_client_portal.sql', '019', '019_client_portal.sql'),
    ('020_user_roles_backfill.sql', '020', '020_user_roles_backfill.sql'),
    ('021_portal_activity_logs.sql', '021', '021_portal_activity_logs.sql'),
    ('022_meeting_manager.sql', '022', '022_meeting_manager.sql'),
    ('023_mfa_webauthn.sql', '023', '023_mfa_webauthn.sql'),
    ('024_organization_branding.sql', '024', '024_organization_branding.sql'),
    ('025_theme_presets.sql', '025', '025_theme_presets.sql'),
    ('026_data_scopes.sql', '026', '026_data_scopes.sql'),
    ('027_contact_alerts_and_address.sql', '027', '027_contact_alerts_and_address.sql'),
    ('028_contact_tags.sql', '028', '028_contact_tags.sql'),
    ('029_enforce_mfa_for_roles.sql', '029', '029_enforce_mfa_for_roles.sql'),
    ('030_api_key_authentication.sql', '030', '030_api_key_authentication.sql'),
    ('031_add_pii_encryption_fields.sql', '031', '031_add_pii_encryption_fields.sql'),
    ('032_row_level_security.sql', '032', '032_row_level_security.sql'),
    ('033_audit_logging.sql', '033', '033_audit_logging.sql'),
    ('034_email_settings_and_password_resets.sql', '034', '034_email_settings_and_password_resets.sql'),
    ('035_registration_settings.sql', '035', '035_registration_settings.sql'),
    ('036_contact_preferred_name_and_role_updates.sql', '036', '036_contact_preferred_name_and_role_updates.sql'),
    ('037_contact_roles_client_subtypes_and_contact.sql', '037', '037_contact_roles_client_subtypes_and_contact.sql'),
    ('038_contact_roles_rename_caregiver_to_support_person.sql', '038', '038_contact_roles_rename_caregiver_to_support_person.sql'),
    ('039_contact_sms_voicemail_preferences.sql', '039', '039_contact_sms_voicemail_preferences.sql'),
    ('040_events_public_visibility.sql', '040', '040_events_public_visibility.sql'),
    ('041_events_recurrence.sql', '041', '041_events_recurrence.sql'),
    ('042_external_service_providers.sql', '042', '042_external_service_providers.sql'),
    ('043_alerts.sql', '043', '043_alerts.sql'),
    ('044_outcomes_tracking.sql', '044', '044_outcomes_tracking.sql'),
    ('045_event_reminders_and_twilio_settings.sql', '045', '045_event_reminders_and_twilio_settings.sql'),
    ('046_event_reminder_automations.sql', '046', '046_event_reminder_automations.sql'),
    ('047_portal_visibility_and_messaging.sql', '047', '047_portal_visibility_and_messaging.sql'),
    ('048_portal_appointment_slots.sql', '048', '048_portal_appointment_slots.sql'),
    ('049_audit_trigger_record_id_fallback.sql', '049', '049_audit_trigger_record_id_fallback.sql'),
    ('050_case_client_visibility_notes_outcomes_topics_documents.sql', '050', '050_case_client_visibility_notes_outcomes_topics_documents.sql'),
    ('051_webhook_delivery_queue_hardening.sql', '051', '051_webhook_delivery_queue_hardening.sql'),
    ('052_webhook_delivery_and_payment_webhook_idempotency.sql', '052', '052_webhook_delivery_and_payment_webhook_idempotency.sql'),
    ('053_follow_ups.sql', '053', '053_follow_ups.sql'),
    ('054_scheduled_reports.sql', '054', '054_scheduled_reports.sql'),
    ('055_opportunities_pipeline.sql', '055', '055_opportunities_pipeline.sql'),
    ('056_team_chat_case_threads.sql', '056', '056_team_chat_case_threads.sql'),
    ('057_saved_reports_entity_alignment.sql', '057', '057_saved_reports_entity_alignment.sql'),
    ('058_report_templates.sql', '058', '058_report_templates.sql'),
    ('059_saved_report_public_snapshots.sql', '059', '059_saved_report_public_snapshots.sql'),
    ('060a_event_checkin_and_appointment_reminders.sql', '060a', '060a_event_checkin_and_appointment_reminders.sql'),
    ('060b_saved_reports_sharing_columns.sql', '060b', '060b_saved_reports_sharing_columns.sql'),
    ('061_audit_log_partition_rollforward.sql', '061', '061_audit_log_partition_rollforward.sql'),
    ('062_efficiency_refactor_indexes.sql', '062', '062_efficiency_refactor_indexes.sql'),
    ('063_case_outcomes_dual_model_alignment.sql', '063', '063_case_outcomes_dual_model_alignment.sql'),
    ('064_contacts_phn_encrypted.sql', '064', '064_contacts_phn_encrypted.sql'),
    ('065_event_public_checkin_settings.sql', '065', '065_event_public_checkin_settings.sql'),
    ('066_website_builder_v2_org_scope.sql', '066', '066_website_builder_v2_org_scope.sql'),
    ('067_website_site_console_settings.sql', '067', '067_website_site_console_settings.sql'),
    ('068_people_import_export_support.sql', '068', '068_people_import_export_support.sql'),
    ('069_public_submission_export_jobs_activity_conversion_events.sql', '069', '069_public_submission_export_jobs_activity_conversion_events.sql'),
    ('070_activity_conversion_event_provenance_backfill.sql', '070', '070_activity_conversion_event_provenance_backfill.sql'),
    ('071_case_workflow_coverage_recovery.sql', '071', '071_case_workflow_coverage_recovery.sql'),
    ('072_volunteer_assignments.sql', '072', '072_volunteer_assignments.sql'),
    ('073_contact_method_sync_backfill.sql', '073', '073_contact_method_sync_backfill.sql'),
    ('074_email_settings_starttls_defaults.sql', '074', '074_email_settings_starttls_defaults.sql'),
    ('075_staff_backend_efficiency_search_indexes.sql', '075', '075_staff_backend_efficiency_search_indexes.sql'),
    ('076_contact_note_outcome_tracking.sql', '076', '076_contact_note_outcome_tracking.sql'),
    ('077_recurring_donation_processing.sql', '077', '077_recurring_donation_processing.sql'),
    ('078_team_messenger_split.sql', '078', '078_team_messenger_split.sql'),
    ('079_donation_tax_receipts_and_org_settings.sql', '079', '079_donation_tax_receipts_and_org_settings.sql'),
    ('080_social_media_tracking.sql', '080', '080_social_media_tracking.sql'),
    ('081_messaging_client_message_ids.sql', '081', '081_messaging_client_message_ids.sql'),
    ('082_backend_runtime_efficiency_indexes.sql', '082', '082_backend_runtime_efficiency_indexes.sql'),
    ('083_grants_tracking.sql', '083', '083_grants_tracking.sql'),
    ('084_imported_import_staging.sql', '084', '084_imported_import_staging.sql'),
    ('085_case_type_and_outcome_assignments.sql', '085', '085_case_type_and_outcome_assignments.sql'),
    ('086_imported_case_contact_org_backfill.sql', '086', '086_imported_case_contact_org_backfill.sql'),
    ('087_newsletter_provider_settings.sql', '087', '087_newsletter_provider_settings.sql')
ON CONFLICT (filename) DO UPDATE
SET migration_id = EXCLUDED.migration_id,
    canonical_filename = EXCLUDED.canonical_filename;

-- Starter-only seed path so fresh environments land on /setup without demo rows.
\i /seeds/002_starter_templates.sql
\i /seeds/006_theme_presets.sql
\i /seeds/007_data_scopes.sql
\i /seeds/008_outcome_definitions.sql
