-- Extend saved_reports table for sharing functionality
ALTER TABLE saved_reports
ADD COLUMN IF NOT EXISTS shared_with_users UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shared_with_roles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS public_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{}';

-- Create index on public_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_reports_public_token ON saved_reports (public_token) WHERE public_token IS NOT NULL;

-- Create index on shared_with_users for filtering
CREATE INDEX IF NOT EXISTS idx_saved_reports_shared_users ON saved_reports USING GIN (shared_with_users);

-- Create index on shared_with_roles for filtering
CREATE INDEX IF NOT EXISTS idx_saved_reports_shared_roles ON saved_reports USING GIN (shared_with_roles);
