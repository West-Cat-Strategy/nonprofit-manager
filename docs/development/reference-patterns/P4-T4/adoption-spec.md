# P4-T4 Team Chat Adoption Spec

## Locked Decisions

1. Case-scoped team chat only in v1.
2. Dedicated persistence; no reuse of portal messaging tables.
3. Polling delivery in v1.
4. Internal authenticated staff/admin audience only.

## API Contract (v2)

- `GET /api/v2/team-chat/inbox`
- `GET /api/v2/team-chat/unread-summary`
- `GET /api/v2/team-chat/cases/:caseId`
- `GET /api/v2/team-chat/cases/:caseId/messages`
- `POST /api/v2/team-chat/cases/:caseId/messages`
- `POST /api/v2/team-chat/cases/:caseId/read`
- `GET /api/v2/team-chat/cases/:caseId/members`
- `POST /api/v2/team-chat/cases/:caseId/members`
- `DELETE /api/v2/team-chat/cases/:caseId/members/:userId`

All endpoints use canonical success/error envelope and correlation-id behavior.

### Message Contract

- Create payload: `body` (1..5000), optional `parent_message_id`, optional `mention_user_ids` (max 10).
- Cursor paging: `limit` default `50`, max `100`.
- Cursor rules: allow zero or one cursor; reject requests that provide both `after_message_id` and `before_message_id`.

## Data Model

- `team_chat_rooms`
- `team_chat_members`
- `team_chat_messages`
- `team_chat_message_mentions`

Denormalized room fields are maintained by trigger on message insert.

## Authorization and Tenancy

- Require auth + active org context for all team-chat routes.
- Case/org guard uses `COALESCE(cases.account_id, contacts.account_id) = req.organizationId`.
- Read/post requires membership, with manage override auto-join as observer.
- First room access bootstraps room and baseline members.

## Polling Contract

- Active thread polling: every 15 seconds.
- Inbox/unread summary polling: every 30 seconds.
- Polling pauses when browser tab is hidden.

## Reserved Event Taxonomy (Phase-2 Push Transport)

- `team_chat.message.created`
- `team_chat.room.read`
- `team_chat.member.added`
- `team_chat.member.removed`
- `team_chat.room.bootstrapped`

These names are defined now for forward compatibility; v1 remains polling-only.

## Feature Flag

- Backend: `TEAM_CHAT_ENABLED`
- Frontend: `VITE_TEAM_CHAT_ENABLED`

## Deferred to Post-v1

- Push transport (WebSocket/SSE)
- Attachments
- Reactions
- Message edits/deletes UI
- Direct messages
