# Events API Reference (`/api/v2/events`)

This document describes the current Events v2 contract, including registration check-in metadata, reminder automation, QR scan check-in, public kiosk check-in, and portal QR pass fields.

## Auth and Envelope

- Auth: `Authorization: Bearer <jwt>`
- Success envelope:
  - `{ "success": true, "data": ... }`
- Error envelope:
  - `{ "success": false, "error": { "code": "...", "message": "..." } }`

## Permissions

- `EVENT_VIEW`: list/get/summary/calendar/registration reads
- `EVENT_CREATE`: create event
- `EVENT_EDIT`: event update, registration mutate/check-in, reminder send/automation mutate
- `EVENT_DELETE`: delete event

## Event Endpoints

1. `GET /api/v2/events`
- Query: `search`, `event_type`, `status`, `is_public`, `start_date`, `end_date`, `page`, `limit`, `sort_by`, `sort_order`
- Returns paginated event list.

2. `GET /api/v2/events/:id`
- Returns single event.

3. `GET /api/v2/events/summary`
- Returns attendance summary payload.

4. `GET /api/v2/events/:id/calendar.ics`
- Returns event ICS attachment.

5. `POST /api/v2/events`
- Body: create event schema (name/type/start/end required).

6. `PUT /api/v2/events/:id`
- Body: partial event update schema.

7. `DELETE /api/v2/events/:id`
- Soft-cancels event.

## Registration and Check-In Endpoints

1. `GET /api/v2/events/:id/registrations`
- Query: `registration_status` (or `status`), `checked_in`

2. `GET /api/v2/events/registrations`
- Query: `event_id` or `contact_id`, optional `registration_status`/`status`, `checked_in`

3. `POST /api/v2/events/:id/register`
- Body: `{ contact_id, registration_status?, notes? }`

4. `PUT /api/v2/events/registrations/:id`
- Body: `{ registration_status?, notes? }`

5. `POST /api/v2/events/registrations/:id/check-in`

6. `POST /api/v2/events/registrations/:id/checkin`

7. `POST /api/v2/events/:id/check-in/scan`
- Body: `{ "token": "<registration check_in_token uuid>" }`
- Resolves registration by `(event_id, check_in_token)` and performs QR check-in.

8. `POST /api/v2/events/check-in/scan`
- Body: `{ "token": "<registration check_in_token uuid>" }`
- Global token scan for staff check-in desks. Event is resolved server-side and scope-filtered.

9. `GET /api/v2/events/:id/check-in/settings`

10. `PATCH /api/v2/events/:id/check-in/settings`
- Body: `{ "public_checkin_enabled": boolean }`

11. `POST /api/v2/events/:id/check-in/pin/rotate`
- Returns one-time plaintext PIN in response data (`pin`) plus persisted kiosk settings metadata.

12. `POST /api/v2/events/:id/walk-ins`
- Body: `{ first_name, last_name, email?, phone?, notes?, registration_status? }`
- Creates or resolves contact, registers attendee if needed, and checks in immediately.

13. `DELETE /api/v2/events/registrations/:id`

### Check-In Guardrails

- `POST /api/v2/events/registrations/:id/check-in`
- `POST /api/v2/events/:id/check-in/scan`
- `POST /api/v2/events/check-in/scan`

All staff check-in paths enforce:
- event status must not be `cancelled` or `completed`
- check-in window is constrained to:
  - `EVENT_CHECKIN_WINDOW_BEFORE_MINUTES` (default `180`) before `start_date`
  - `EVENT_CHECKIN_WINDOW_AFTER_MINUTES` (default `240`) after `end_date`

### Registration Response Fields (staff flows)

Registration payloads include:
- `registration_id`
- `event_id`
- `contact_id`
- `registration_status`
- `checked_in`
- `check_in_time`
- `checked_in_by`
- `check_in_method` (`manual` or `qr`)
- `check_in_token` (persistent registration token)
- `notes`
- `created_at`
- `updated_at`

## Public Kiosk Check-In Endpoints (`/api/v2/public/events`)

1. `GET /api/v2/public/events/:id/check-in`
- Public-safe event metadata for kiosk screens when kiosk mode is enabled for a public event.

2. `POST /api/v2/public/events/:id/check-in`
- Body: `{ first_name, last_name, email?, phone?, pin }`
- Requires staff-issued PIN.
- Auto-registers attendee (if needed) and auto-checks in.
- Idempotent: repeated submissions for an already checked-in attendee return `already_checked_in`.

## Public Events Catalog Endpoints (`/api/v2/public/events*`)

These endpoints are read-only and tenant-safe. Public events are resolved from a published site owner and return only:
- `is_public = true`
- statuses in `planned | active | postponed`

1. `GET /api/v2/public/events`
- Site resolution:
  - Primary: request host (`subdomain`/`custom_domain`)
  - Local/dev fallback: optional `site` query (`subdomain` or custom domain)
- Query:
  - `search`
  - `event_type`
  - `include_past` (default: `false`)
  - `limit` (1..50)
  - `offset` (0+)
  - `sort_by` (`start_date | name | created_at`)
  - `sort_order` (`asc | desc`)

2. `GET /api/v2/public/events/sites/:siteKey`
- Explicit published-site binding by `siteKey` (`subdomain` or custom domain).
- Same query contract and response shape as host-resolved route.

### Public Catalog Response Shape

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "event_id": "uuid",
        "event_name": "Community Dinner",
        "description": "Optional",
        "event_type": "community",
        "status": "planned",
        "start_date": "2026-04-01T18:00:00.000Z",
        "end_date": "2026-04-01T20:00:00.000Z",
        "location_name": "Main Hall",
        "city": "Vancouver",
        "state_province": "BC",
        "country": "Canada",
        "capacity": 120,
        "registered_count": 24
      }
    ],
    "page": {
      "limit": 12,
      "offset": 0,
      "total": 42,
      "has_more": true
    },
    "site": {
      "id": "uuid",
      "name": "Example Site",
      "subdomain": "example",
      "customDomain": null
    }
  }
}
```

## Portal Contract Extension (`GET /api/v2/portal/events`)

Portal event rows now include registration check-in metadata for the current portal user:
- `check_in_token`
- `checked_in`
- `check_in_time`
- `check_in_method`
- Security note: kiosk PIN material is not exposed in portal payloads (`public_checkin_pin_hash` is never returned).

## Reminder Send and Automation

1. `POST /api/v2/events/:id/reminders/send`
- Body:
  - `{ sendEmail?: boolean, sendSms?: boolean, customMessage?: string }`
- Sends reminders to `registered` and `confirmed` registrations.
- Enforces recipient consent and channel configuration.

2. `GET /api/v2/events/:id/reminder-automations`

3. `POST /api/v2/events/:id/reminder-automations`

4. `PATCH /api/v2/events/:id/reminder-automations/:automationId`

5. `POST /api/v2/events/:id/reminder-automations/:automationId/cancel`

6. `PUT /api/v2/events/:id/reminder-automations/sync`
- Body:
  - `{ items: Array<{ timingType, relativeMinutesBefore?, absoluteSendAt?, sendEmail?, sendSms?, customMessage?, timezone? }> }`

### Automation lifecycle notes

- Sync is transactional.
- Pending automations are deterministically terminalized as `cancelled` when replaced or when events become non-sendable (cancelled/completed/past start).
- Terminal attempt statuses: `sent`, `partial`, `failed`, `skipped`, `cancelled`.

## Common Error Codes

- `EVENT_NOT_FOUND`
- `REGISTRATION_NOT_FOUND`
- `CHECKIN_ERROR`
- `AUTOMATION_NOT_FOUND`
- `VALIDATION_ERROR`
- `FORBIDDEN`
- `UNAUTHORIZED`
