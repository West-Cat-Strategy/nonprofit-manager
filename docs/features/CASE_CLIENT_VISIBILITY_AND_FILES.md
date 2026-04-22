# Case Client Visibility and Files

**Last Updated:** 2026-04-22
**Applies To:** `/api/v2/cases/*`, `/api/v2/portal/cases/*`

## Purpose

This feature makes case collaboration safe-by-default while allowing staff to selectively share case content with clients in the portal.

Default posture is private:
- `cases.client_viewable = false`
- `case_notes.visible_to_client = false`
- `case_outcomes.visible_to_client = false`
- `case_documents.visible_to_client = false`

## Visibility Rules

A portal client can see a case only when all conditions are true:
1. `portal_user.contact_id = cases.contact_id`
2. `cases.client_viewable = true`

Inside a shared case, a portal client can only see:
- notes where `visible_to_client = true`
- outcomes where `visible_to_client = true`
- documents where `visible_to_client = true`

Topics are staff-only in the current release.

## Staff Workflow

## 1) Notes

Staff can:
- create notes (`POST /api/v2/cases/notes`)
- edit notes (`PUT /api/v2/cases/notes/:noteId`)
- delete notes (`DELETE /api/v2/cases/notes/:noteId`)
- set optional `category`
- mark `visible_to_client`
- optionally include `outcome_impacts[]` + `outcomes_mode` in note create/update payloads (atomic write)

Compatibility aliases are accepted during transition:
- `visible_to_client`
- `is_portal_visible`

## 2) Outcomes and Topics

Outcomes are structured case events:
- list/create/update/delete under `/api/v2/cases/:id/outcomes` and `/api/v2/cases/outcomes/:outcomeId`
- fields: `outcome_type`, `outcome_definition_id`, `outcome_date`, `notes`, `visible_to_client`
- read metadata includes `outcome_definition_key`, `outcome_definition_name`, `source_interaction_id`, `entry_source`
- `entry_source` values: `manual`, `interaction_sync`, `legacy`

Topics are account-scoped taxonomy plus case events:
- definitions: `/api/v2/cases/:id/topics/definitions`
- case topic events: `/api/v2/cases/:id/topics`

## 3) Documents

Case-native documents use `/api/v2/cases/:id/documents` endpoints.

Stored metadata includes:
- `original_filename`
- `mime_type`
- `file_size`
- `uploaded_by`
- `created_at`
- `visible_to_client`

Downloads are authenticated and streamed:
- staff: `GET /api/v2/cases/:id/documents/:documentId/download`
- portal: `GET /api/v2/portal/cases/:id/documents/:documentId/download`

Inline preview is supported for safe mime types (`application/pdf`, images) using `?disposition=inline`.

## Portal Endpoints

- `GET /api/v2/portal/cases`
- `GET /api/v2/portal/cases/:id`
- `GET /api/v2/portal/cases/:id/timeline?limit=50&cursor=...`
- `GET /api/v2/portal/cases/:id/documents`
- `GET /api/v2/portal/cases/:id/documents/:documentId/download`
- `GET /api/v2/portal/forms/assignments`
- `GET /api/v2/portal/forms/assignments/:assignmentId`
- `POST /api/v2/portal/forms/assignments/:assignmentId/draft`
- `POST /api/v2/portal/forms/assignments/:assignmentId/submit`
- `POST /api/v2/portal/forms/assignments/:assignmentId/assets`
- `GET /api/v2/portal/forms/assignments/:assignmentId/response-packet`

The `/portal/forms` route is the assignment-backed case-form inbox for client-visible case work. Active assignments stay in the default bucket until they are reviewed or closed, and reviewed items move into the completed bucket with read-only receipt and packet links. Each assignment card surfaces the case context summary and due date when one exists.

Portal form uploads use `POST /api/v2/portal/forms/assignments/:assignmentId/assets` for question-bound upload and signature attachments.

The older `GET /api/v2/portal/forms` endpoint remains the read-only shared form-document resource list, not the interactive assignment workflow.

Portal timeline intentionally excludes staff-only topic events.
Both staff and portal timeline endpoints return a cursor-paged payload:

```json
{
  "items": [],
  "page": {
    "limit": 50,
    "has_more": false,
    "next_cursor": null
  }
}
```

## Data Model Changes

Primary migration:
- `database/migrations/050_case_client_visibility_notes_outcomes_topics_documents.sql`
- `database/migrations/063_case_outcomes_dual_model_alignment.sql`

Key changes:
- `cases.client_viewable`
- `case_notes.visible_to_client`, `category`, update audit fields
- new `case_outcomes`
- case outcomes linkage columns (`outcome_definition_id`, `source_interaction_id`, `entry_source`)
- new `case_topic_definitions`, `case_topic_events`
- activated `case_documents` as primary case attachment model with visibility + audit fields

## Upload Security

File uploads reuse existing secure middleware/services:
- `backend/src/middleware/upload.ts`
- `backend/src/services/fileStorageService.ts`

Controls:
- whitelist mime types (pdf/images/common office docs)
- max file size 10MB (`MAX_FILE_SIZE`)
- randomized storage filename (`UUID` prefix)
- path traversal guard (`assertPathWithinBase`)
- files stored outside public root
- authenticated streaming download endpoints

## Environment Variables

- `UPLOAD_DIR` (optional): backend upload base directory
  - default: `backend/uploads` (resolved from `fileStorageService`)
  - runtime-only storage: keep the directory writable locally, but do not commit generated `backend/uploads/**` contents

## Manual QA Checklist

1. Staff case detail
- Toggle `Client Viewable` on/off and confirm persistence.
- Add note with `visible_to_client=false`; verify internal badge.
- Edit same note to `visible_to_client=true`; verify timeline badge update.

2. Outcomes + topics
- Add manual outcome with definition selected; verify definition metadata and `entry_source=manual`.
- Add interaction outcome tags on a note; verify synced case outcomes appear with `entry_source=interaction_sync`.
- Add outcome with `visible_to_client=false`; verify it appears in staff timeline only.
- Add outcome with `visible_to_client=true`; verify it appears in portal timeline.
- Create topic definition + topic event; verify visible on staff timeline.

3. Documents
- Upload allowed file types and verify metadata saved.
- Try blocked mime type or oversized file and verify validation error.
- Download uploaded document as staff.
- Preview PDF/image with `disposition=inline`.

4. Portal
- Log in as linked portal user.
- Confirm case appears only after `client_viewable=true`.
- Open `/portal/forms`, verify the active bucket is the default, then switch to completed and confirm reviewed assignments expose receipt and packet links.
- Open case detail and verify:
  - visible note appears
  - internal note does not appear
  - visible outcome appears
  - internal outcome does not appear
  - visible document appears and downloads
  - internal document is absent and direct download URL is denied

5. Authorization
- Attempt portal access to another client's case id and verify `404/forbidden` behavior.

## Automated Tests

Backend integration:
- `backend/src/__tests__/integration/caseManagementVisibility.test.ts`
- `backend/src/__tests__/integration/portalMessaging.test.ts` (client_viewable gating seed)
- `backend/src/__tests__/integration/portalAppointments.test.ts` (client_viewable gating seed)

Frontend tests:
- `frontend/src/components/__tests__/CaseNotes.test.tsx`
- `frontend/src/features/portal/pages/__tests__/PortalCasesPage.test.tsx`

Playwright:
- `e2e/tests/portal-cases-visibility.spec.ts`
