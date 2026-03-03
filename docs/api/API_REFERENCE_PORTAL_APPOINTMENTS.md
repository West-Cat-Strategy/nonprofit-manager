# Portal Appointments API Reference

Current appointment contracts for portal users (`/api/v2/portal`) and staff operations (`/api/v2/portal/admin`).

## Auth

- Portal user routes: portal auth cookie (`portal_auth_token`)
- Admin routes: bearer JWT and admin role

## Portal User Endpoints (`/api/v2/portal`)

1. `GET /appointments`
- Query: `status`, `case_id`, `from`, `to`, `search`, `limit`, `offset`

2. `GET /appointments/slots`
- Query: `case_id`
- Returns selected case/pointperson context and open slots.

3. `POST /appointments/slots/:slotId/book`
- Body: `{ case_id?, title?, description? }`
- Duplicate bookings are allowed when capacity permits; each booking consumes capacity.

4. `POST /appointments/requests`
- Body: `{ case_id?, title, start_time, end_time?, description?, location? }`
- Validation enforces `end_time > start_time` when `end_time` is provided.

5. `PATCH /appointments/:id/cancel`
- Cancels appointment and reconciles slot counters for slot-backed appointments.

6. `GET /reminders`
- Returns normalized upcoming reminders only:
  - appointments: `status='confirmed'` and `start_time >= NOW()`
  - events: registration status in `registered|confirmed` and event start in future

## Admin Appointment Operations (`/api/v2/portal/admin`)

1. `GET /appointments`
- Query: `status`, `request_type`, `case_id`, `pointperson_user_id`, `date_from`, `date_to`, `page`, `limit`
- Returns `{ data, pagination }` with reminder/check-in metadata.

2. `PATCH /appointments/:id/status`
- Body: `{ status: 'requested' | 'confirmed' | 'cancelled' | 'completed' }`
- Slot-backed appointments reconcile `booked_count` deterministically across transitions.
- Reminder lifecycle hooks:
  - `confirmed` => sync reminder jobs
  - `cancelled|completed` => cancel pending jobs

3. `POST /appointments/:id/check-in`
- Marks attended (`status='completed'`), sets check-in metadata (`checked_in_at`, `checked_in_by`).

4. `GET /appointments/:id/reminders`
- Returns reminder jobs and delivery history:
  - `{ jobs: [...], deliveries: [...] }`

5. `POST /appointments/:id/reminders/send`
- Body: `{ sendEmail?: boolean, sendSms?: boolean, customMessage?: string }`
- Manual reminder send with delivery audit rows.
- Enforces confirmed/future eligibility and contact consent (`do_not_email`, `do_not_text`).

## Reminder Job Model

`appointment_reminder_jobs`:
- one row per `(appointment_id, cadence_key, channel)`
- cadence keys: `24h`, `2h`
- channels: `email`, `sms`
- statuses: `pending`, `processing`, `sent`, `failed`, `skipped`, `cancelled`

`appointment_reminder_deliveries`:
- audit rows for automated and manual sends
- fields include channel, recipient, delivery status, trigger type, message preview, error

## Scheduler Flags

- `APPOINTMENT_REMINDER_SCHEDULER_ENABLED`
- `APPOINTMENT_REMINDER_SCHEDULER_INTERVAL_MS`
- `APPOINTMENT_REMINDER_SCHEDULER_BATCH_SIZE`
- `APPOINTMENT_REMINDER_SCHEDULER_RETRY_ATTEMPTS`
- `APPOINTMENT_REMINDER_SCHEDULER_RETRY_DELAY_MS`
- `APPOINTMENT_REMINDER_SCHEDULER_TIMEOUT_MS`
