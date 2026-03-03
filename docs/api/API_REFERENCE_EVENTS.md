# Events API Reference (`/api/v2/events`)

This document describes the current Events v2 contract, including registration check-in metadata, reminder automation, and QR scan check-in.

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

8. `DELETE /api/v2/events/registrations/:id`

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
