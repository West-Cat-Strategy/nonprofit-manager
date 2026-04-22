# Portal Realtime + Filtering Contracts (P4-T7D)

**Last Updated:** 2026-04-22


## Scope
This document describes the P4-T7D contract extension for client and admin portal messaging/appointments, plus the maintained distinction between paged portal resource lists and the assignment-backed portal forms inbox.

## Feature Flags
- Backend realtime gate: `PORTAL_REALTIME_ENABLED`
  - `true`: SSE endpoints are enabled.
  - any other value: stream endpoints return disabled errors and clients use polling fallback.
- Frontend realtime gate: `VITE_PORTAL_REALTIME_ENABLED`
  - `true`: client/admin pages attempt SSE.
  - any other value: polling fallback remains active.

## Client Endpoints
- `GET /api/v2/portal/messages/threads`
  - optional query: `status`, `case_id`, `search`, `limit`, `offset`
  - response envelope unchanged: `data.threads`
- `GET /api/v2/portal/appointments`
  - optional query: `status`, `case_id`, `from`, `to`, `search`, `limit`, `offset`
  - response envelope unchanged: `data`
- `GET /api/v2/portal/events`
  - optional query: `search`, `sort`, `order`, `limit`, `offset`
  - allowed sort values: `start_date`, `name`, `created_at`
  - response contract: `data = { items, page }`
- `GET /api/v2/portal/documents`
  - optional query: `search`, `sort`, `order`, `limit`, `offset`
  - allowed sort values: `created_at`, `title`, `document_type`, `original_name`
  - response contract: `data = { items, page }`
- `GET /api/v2/portal/forms/assignments`
  - optional query: `status`
  - response contract: `data = CaseFormAssignment[]`
  - `/portal/forms` uses this assignment inbox together with `/api/v2/portal/forms/assignments/:assignmentId` detail, `/draft`, `/submit`, `/assets`, and `/response-packet`
  - `status` accepts raw assignment statuses plus the inbox buckets `active` (`draft`, `sent`, `viewed`, `in_progress`, `submitted`) and `completed` (`reviewed`, `closed`, `expired`, `cancelled`)
- `GET /api/v2/portal/forms`
  - optional query: `search`, `sort`, `order`, `limit`, `offset`
  - allowed sort values: `created_at`, `title`, `document_type`, `original_name`
  - response contract: `data = { items, page }`
  - read-only shared form documents/resources list; not the interactive `/portal/forms` inbox runtime
- `GET /api/v2/portal/notes`
  - optional query: `search`, `sort`, `order`, `limit`, `offset`
  - allowed sort values: `created_at`, `subject`, `note_type`
  - response contract: `data = { items, page }`
- `GET /api/v2/portal/reminders`
  - optional query: `search`, `sort`, `order`, `limit`, `offset`
  - allowed sort values: `date`, `title`, `type`
  - response contract: `data = { items, page }`
- `GET /api/v2/portal/stream?channels=messages,appointments`
  - SSE events:
    - `portal.thread.updated`
    - `portal.appointment.updated`
    - `portal.slot.updated`

### Shared offset page payload
All paged client resources above except `/api/v2/portal/forms/assignments` return:

```json
{
  "items": [],
  "page": {
    "limit": 20,
    "offset": 0,
    "has_more": false,
    "total": 0
  }
}
```

## Admin Endpoints
- `GET /api/v2/portal/admin/conversations`
  - optional query: `status`, `case_id`, `pointperson_user_id`, `search`, `limit`, `offset`
  - response shape unchanged: `conversations`
- `GET /api/v2/portal/admin/appointment-slots`
  - optional query: `status`, `case_id`, `pointperson_user_id`, `from`, `to`, `limit`, `offset`
  - response shape unchanged: `slots`
- `GET /api/v2/portal/admin/stream?channels=conversations,appointments,slots`
  - SSE events:
    - `portal.thread.updated`
    - `portal.appointment.updated`
    - `portal.slot.updated`

## Event Payload Contract
Each SSE event payload includes:
- `event_id`
- `occurred_at`
- `entity_id`
- `case_id`
- `status`
- `actor_type`
- `source`

## Download Hardening
`GET /api/v2/portal/documents/:id/download` now:
- validates file existence before streaming,
- returns deterministic `404` for missing files,
- sanitizes and encodes `Content-Disposition` filenames.
