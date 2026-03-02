-- Migration 056: Team chat case-scoped rooms (polling v1)

CREATE TABLE IF NOT EXISTS team_chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_message_preview VARCHAR(255),
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT team_chat_rooms_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT uq_team_chat_rooms_org_case UNIQUE (organization_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_team_chat_rooms_org_status_last_message
  ON team_chat_rooms(organization_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_chat_rooms_case
  ON team_chat_rooms(case_id);

CREATE TABLE IF NOT EXISTS team_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES team_chat_rooms(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  parent_message_id UUID REFERENCES team_chat_messages(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT team_chat_messages_body_nonempty CHECK (char_length(BTRIM(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_room_created
  ON team_chat_messages(room_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_parent
  ON team_chat_messages(parent_message_id);

CREATE TABLE IF NOT EXISTS team_chat_members (
  room_id UUID NOT NULL REFERENCES team_chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_role VARCHAR(20) NOT NULL DEFAULT 'member',
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP WITH TIME ZONE,
  last_read_message_id UUID,
  muted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT team_chat_members_role_check CHECK (membership_role IN ('owner', 'member', 'observer')),
  CONSTRAINT team_chat_members_source_check CHECK (source IN ('manual', 'case_assignee', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_team_chat_members_user
  ON team_chat_members(user_id, room_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_chat_members_last_read_message_fk'
  ) THEN
    ALTER TABLE team_chat_members
      ADD CONSTRAINT team_chat_members_last_read_message_fk
      FOREIGN KEY (last_read_message_id) REFERENCES team_chat_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS team_chat_message_mentions (
  message_id UUID NOT NULL REFERENCES team_chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_chat_message_mentions_user_created
  ON team_chat_message_mentions(mentioned_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION sync_team_chat_room_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE team_chat_rooms
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.body, 255),
    message_count = message_count + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_team_chat_room_on_message_insert ON team_chat_messages;
CREATE TRIGGER trigger_sync_team_chat_room_on_message_insert
AFTER INSERT ON team_chat_messages
FOR EACH ROW EXECUTE FUNCTION sync_team_chat_room_on_message_insert();

DROP TRIGGER IF EXISTS update_team_chat_rooms_updated_at ON team_chat_rooms;
CREATE TRIGGER update_team_chat_rooms_updated_at
BEFORE UPDATE ON team_chat_rooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO permissions (name, resource, action, description)
VALUES
  ('team_chat.view', 'team_chat', 'view', 'View team chat rooms and messages'),
  ('team_chat.post', 'team_chat', 'post', 'Post team chat messages'),
  ('team_chat.manage', 'team_chat', 'manage', 'Manage team chat room membership')
ON CONFLICT (name) DO NOTHING;

-- Admin: all team chat permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('team_chat.view', 'team_chat.post', 'team_chat.manage')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: all team chat permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('team_chat.view', 'team_chat.post', 'team_chat.manage')
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Staff: view + post
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('team_chat.view', 'team_chat.post')
WHERE r.name = 'staff'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE team_chat_rooms IS 'Case-scoped internal team chat rooms';
COMMENT ON TABLE team_chat_members IS 'Team chat room membership and read cursors';
COMMENT ON TABLE team_chat_messages IS 'Messages in team chat rooms';
COMMENT ON TABLE team_chat_message_mentions IS 'Mention references for team chat messages';
