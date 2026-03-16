-- Migration 081: Add client message ids for idempotent messaging sends

ALTER TABLE team_chat_messages
  ADD COLUMN IF NOT EXISTS client_message_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_chat_messages_room_sender_client_message_id
  ON team_chat_messages(room_id, sender_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

ALTER TABLE portal_messages
  ADD COLUMN IF NOT EXISTS client_message_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_messages_thread_staff_client_message_id
  ON portal_messages(thread_id, sender_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL
    AND sender_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_messages_thread_portal_client_message_id
  ON portal_messages(thread_id, sender_portal_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL
    AND sender_portal_user_id IS NOT NULL;

COMMENT ON COLUMN team_chat_messages.client_message_id IS 'Client-generated id used for idempotent send reconciliation';
COMMENT ON COLUMN portal_messages.client_message_id IS 'Client-generated id used for idempotent send reconciliation';
