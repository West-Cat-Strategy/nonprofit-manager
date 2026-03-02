# Follow-up Lifecycle

## Overview

The follow-up lifecycle feature manages scheduleable reminders tied to cases and tasks.

Primary objectives:
- Ensure next-step commitments are visible and actionable.
- Support recurring cadence (`daily`, `weekly`, `biweekly`, `monthly`).
- Provide global and entity-scoped views.
- Support optional reminder delivery via scheduler.

## API Surface

- `GET /api/follow-ups`
- `GET /api/follow-ups/summary`
- `GET /api/follow-ups/upcoming`
- `GET /api/follow-ups/:id`
- `POST /api/follow-ups`
- `PUT /api/follow-ups/:id`
- `POST /api/follow-ups/:id/complete`
- `POST /api/follow-ups/:id/cancel`
- `POST /api/follow-ups/:id/reschedule`
- `DELETE /api/follow-ups/:id`
- `GET /api/cases/:id/follow-ups`
- `GET /api/tasks/:id/follow-ups`

## Lifecycle Rules

- `overdue` is computed at query time and not stored as a terminal status.
- Completing a recurring follow-up can create the next instance (`schedule_next`).
- Cancelling or completing a follow-up removes pending reminder queue entries.
- Rescheduling reopens follow-up state and recalculates reminder timing.

## Reminder Scheduler

Flags:
- `FOLLOW_UP_REMINDER_SCHEDULER_ENABLED`
- `FOLLOW_UP_REMINDER_SCHEDULER_INTERVAL_MS`
- `FOLLOW_UP_REMINDER_SCHEDULER_BATCH_SIZE`

Behavior:
- Claims pending due reminders with `FOR UPDATE SKIP LOCKED`.
- Recovers stale processing locks.
- Writes delivery status to `follow_up_notifications`.

## Data Model

Tables:
- `follow_ups`
- `follow_up_notifications`

Migration:
- `database/migrations/053_follow_ups.sql`

## Frontend

Routes:
- `/follow-ups` global management page.
- Case/task nested widgets keep using `FollowUpList` and `FollowUpForm` contracts.

Key files:
- `frontend/src/store/slices/followUpsSlice.ts`
- `frontend/src/pages/engagement/followUps/FollowUpsPage.tsx`
- `frontend/src/components/FollowUpForm.tsx`
- `frontend/src/components/FollowUpList.tsx`
