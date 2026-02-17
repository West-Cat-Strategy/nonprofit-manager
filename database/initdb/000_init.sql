-- Postgres init script for docker-compose.dev.yml
-- Runs migrations (in order), then loads the dev mock dataset.

\set ON_ERROR_STOP on

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
\i /migrations/032_row_level_security_fixed.sql
\i /migrations/033_audit_logging.sql

\i /seeds/001_default_users.sql
\i /seeds/002_starter_templates.sql
\i /seeds/003_mock_data.sql
\i /seeds/004_mock_data_no_users.sql
\i /seeds/005_kingdom_hearts_mock_data.sql
\i /seeds/006_theme_presets.sql
\i /seeds/007_data_scopes.sql
