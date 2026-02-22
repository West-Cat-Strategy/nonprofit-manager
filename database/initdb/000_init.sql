-- Postgres init script for docker-compose.dev.yml
-- Runs migrations (in order), then loads the dev mock dataset.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);

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

\i /seeds/001_default_users.sql
\i /seeds/002_starter_templates.sql
\i /seeds/003_mock_data.sql
\i /seeds/004_mock_data_no_users.sql
\i /seeds/005_kingdom_hearts_mock_data.sql
\i /seeds/006_theme_presets.sql
\i /seeds/007_data_scopes.sql
\i /seeds/008_outcome_definitions.sql
