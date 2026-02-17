-- Add user preferences column for storing user-specific settings
-- This includes navigation preferences, dashboard settings, etc.

-- Add preferences column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create index for common preference queries
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN (preferences);

-- Comment for documentation
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSON (navigation order, dashboard settings, etc.)';
