-- Migration: Add extended profile settings to users table
-- Description: Adds fields for email sharing preferences, alternative emails, and notification settings

-- Add email sharing preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_shared_with_clients BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_shared_with_users BOOLEAN DEFAULT false;

-- Add alternative emails as JSONB array
ALTER TABLE users ADD COLUMN IF NOT EXISTS alternative_emails JSONB DEFAULT '[]'::jsonb;

-- Add notification settings as JSONB object
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{
  "emailNotifications": true,
  "taskReminders": true,
  "eventReminders": true,
  "donationAlerts": true,
  "caseUpdates": true,
  "weeklyDigest": false,
  "marketingEmails": false
}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN users.email_shared_with_clients IS 'Whether email address is shared with clients';
COMMENT ON COLUMN users.email_shared_with_users IS 'Whether email address is shared with other users';
COMMENT ON COLUMN users.alternative_emails IS 'Array of alternative email addresses with labels and verification status';
COMMENT ON COLUMN users.notifications IS 'User notification preferences';
