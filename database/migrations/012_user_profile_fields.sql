-- Migration: Add extended profile fields to users table
-- Description: Adds fields for profile management including display name, pronouns, contact info, and profile picture

-- Add extended profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS alternative_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pronouns VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cell_phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.display_name IS 'How the user wants to be addressed';
COMMENT ON COLUMN users.alternative_name IS 'Nickname, maiden name, or other alternative name';
COMMENT ON COLUMN users.pronouns IS 'User pronouns (e.g., he/him, she/her, they/them)';
COMMENT ON COLUMN users.title IS 'Job title or position';
COMMENT ON COLUMN users.cell_phone IS 'Mobile phone number';
COMMENT ON COLUMN users.contact_number IS 'Alternative contact number';
COMMENT ON COLUMN users.profile_picture IS 'Base64 encoded profile picture or URL';
