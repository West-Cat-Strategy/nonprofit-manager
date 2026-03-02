# P4-T4 Team Chat Pattern Catalog

## Scope

- Target: internal team chat for case collaboration in `nonprofit-manager`
- Delivery mode: polling v1 (15s active thread, 30s inbox/unread summary)
- Context: case-scoped rooms only
- Non-goals (v1): WebSocket/SSE push, attachments, reactions, edits, direct messages

## Source Patterns and Adoption Mode

| Pattern | Reference Source | Adoption Mode | v1 Adaptation |
|---|---|---|---|
| Room/member/message separation with per-member read cursor | Mattermost + Rocket.Chat | `architecture_only` (Mattermost), `adapt_with_attribution` (Rocket.Chat) | `team_chat_rooms`, `team_chat_members`, `team_chat_messages`; unread derived from member cursor |
| Thread-aware message shape | Mattermost | `architecture_only` | `parent_message_id` allows in-room threaded replies |
| Mark-read updates member cursor, unread computed from cursor | Rocket.Chat | `adapt_with_attribution` | `/cases/:caseId/read` updates `last_read_at`/`last_read_message_id`; unread counts derived in inbox queries |
| Realtime event taxonomy defined before transport | Mattermost | `architecture_only` | Polling shipped in v1; event taxonomy reserved in architecture docs for v2 push transport |

## In-Repository Mapping

- Migration: `database/migrations/056_team_chat_case_threads.sql`
- Backend module: `backend/src/modules/teamChat/*`
- Validation: `backend/src/validations/teamChat.ts`
- API surface: `/api/v2/team-chat/*`
- Frontend feature: `frontend/src/features/teamChat/*`

## Attribution Notes

- This adoption follows high-level architecture and semantics inspired by Mattermost and Rocket.Chat.
- No direct source-code copy from reference repositories is used in this implementation.

## Reserved Event Names (v1 docs, v2 transport)

- `team_chat.message.created`
- `team_chat.room.read`
- `team_chat.member.added`
- `team_chat.member.removed`
- `team_chat.room.bootstrapped`
