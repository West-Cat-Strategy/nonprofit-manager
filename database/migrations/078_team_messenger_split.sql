-- Migration 078: Extend team chat rooms for staff messenger direct/group conversations

ALTER TABLE team_chat_rooms
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) NOT NULL DEFAULT 'case',
  ADD COLUMN IF NOT EXISTS title VARCHAR(160),
  ADD COLUMN IF NOT EXISTS direct_key TEXT;

UPDATE team_chat_rooms
SET room_type = 'case'
WHERE room_type IS NULL OR BTRIM(room_type) = '';

ALTER TABLE team_chat_rooms
  ALTER COLUMN case_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_chat_rooms_room_type_check'
  ) THEN
    ALTER TABLE team_chat_rooms
      ADD CONSTRAINT team_chat_rooms_room_type_check
      CHECK (room_type IN ('case', 'direct', 'group'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_chat_rooms_shape_check'
  ) THEN
    ALTER TABLE team_chat_rooms
      ADD CONSTRAINT team_chat_rooms_shape_check
      CHECK (
        (room_type = 'case' AND case_id IS NOT NULL AND title IS NULL AND direct_key IS NULL)
        OR
        (room_type = 'direct' AND case_id IS NULL AND title IS NULL AND direct_key IS NOT NULL)
        OR
        (room_type = 'group' AND case_id IS NULL AND title IS NOT NULL AND char_length(BTRIM(title)) > 0 AND direct_key IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_chat_rooms_org_type_last_message
  ON team_chat_rooms(organization_id, room_type, last_message_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_chat_rooms_direct_key
  ON team_chat_rooms(organization_id, direct_key)
  WHERE room_type = 'direct' AND direct_key IS NOT NULL;

COMMENT ON TABLE team_chat_rooms IS 'Internal team chat rooms for case collaboration plus staff direct/group messenger rooms';
