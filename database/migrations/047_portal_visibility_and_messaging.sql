-- Migration 047: Portal visibility controls + messaging threads

-- ---------------------------------------------------------------------------
-- Visibility flags for contact notes/documents
-- ---------------------------------------------------------------------------
ALTER TABLE contact_notes
  ADD COLUMN IF NOT EXISTS is_portal_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_visible_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS portal_visible_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_contact_notes_portal_visible
  ON contact_notes(contact_id, is_portal_visible)
  WHERE is_portal_visible = true;

ALTER TABLE contact_documents
  ADD COLUMN IF NOT EXISTS is_portal_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_visible_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS portal_visible_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_contact_documents_portal_visible
  ON contact_documents(contact_id, is_portal_visible)
  WHERE is_portal_visible = true;

-- ---------------------------------------------------------------------------
-- Portal thread/message model
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  portal_user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  pointperson_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, closed, archived
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_message_preview VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES users(id),
  CONSTRAINT portal_threads_status_check CHECK (status IN ('open', 'closed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_portal_threads_portal_user
  ON portal_threads(portal_user_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_threads_pointperson
  ON portal_threads(pointperson_user_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_threads_case
  ON portal_threads(case_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_threads_contact
  ON portal_threads(contact_id, status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES portal_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL, -- portal, staff, system
  sender_portal_user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_by_portal_at TIMESTAMP WITH TIME ZONE,
  read_by_staff_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT portal_messages_sender_type_check CHECK (sender_type IN ('portal', 'staff', 'system')),
  CONSTRAINT portal_messages_sender_guard CHECK (
    (sender_type = 'portal' AND sender_portal_user_id IS NOT NULL) OR
    (sender_type = 'staff' AND sender_user_id IS NOT NULL) OR
    (sender_type = 'system')
  )
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_thread_created
  ON portal_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread_staff
  ON portal_messages(thread_id, read_by_staff_at)
  WHERE read_by_staff_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread_portal
  ON portal_messages(thread_id, read_by_portal_at)
  WHERE read_by_portal_at IS NULL;

CREATE OR REPLACE FUNCTION sync_portal_thread_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portal_threads
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message_text, 255),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_portal_thread_on_message_insert ON portal_messages;
CREATE TRIGGER trigger_sync_portal_thread_on_message_insert
AFTER INSERT ON portal_messages
FOR EACH ROW EXECUTE FUNCTION sync_portal_thread_on_message_insert();

COMMENT ON TABLE portal_threads IS 'Portal conversation threads between a client portal user and staff pointperson(s)';
COMMENT ON TABLE portal_messages IS 'Messages within a portal thread';
COMMENT ON COLUMN contact_notes.is_portal_visible IS 'Explicit visibility flag for showing note in client portal';
COMMENT ON COLUMN contact_documents.is_portal_visible IS 'Explicit visibility flag for showing document in client portal';
