# Case Management System

**Last Updated:** 2026-04-25

Use this doc for the current staff-side case-management surface mounted under `/api/v2/cases/*` and the linked route-level behavior in the app. For the route map, use [FEATURE_MATRIX.md](FEATURE_MATRIX.md). For client-visible sharing rules, use [CASE_CLIENT_VISIBILITY_AND_FILES.md](CASE_CLIENT_VISIBILITY_AND_FILES.md).

## Current Surface Summary

- Staff routes cover case catalog, case detail, create/edit flows, timeline, notes, outcomes, documents, milestones, relationships, services, follow-ups, forms, and portal-conversation follow-through.
- Public tokenized case-form submission is supported alongside staff-side case-form assignment, review, and response-packet workflows.
- Portal visibility remains opt-in and is governed separately by [CASE_CLIENT_VISIBILITY_AND_FILES.md](CASE_CLIENT_VISIBILITY_AND_FILES.md).

## Core Current Capabilities

### Case Catalog And Lifecycle

- List, filter, and inspect cases through the routed staff case catalog.
- Create, update, reassign, bulk-update status, and delete cases through the `/api/v2/cases` lifecycle routes.
- Pull summary, case-type, and status metadata from the mounted catalog endpoints used by the staff UI.

### Case Detail Resources

- Timeline and notes for case activity history.
- Outcome definitions, case outcomes, and interaction-level outcome tagging.
- Documents with metadata updates and download flows.
- Milestones, case relationships, and service records.
- Case-scoped follow-up listing.
- Case-scoped reassessment cadence records are being added through the active `P5-T6C1` slice and stay inside the existing case/follow-up surfaces.

### Case Forms

- Case-type default forms and recommended defaults.
- Case-form assignments, draft saving, staff submission, outbound send, and review decisions.
- Assignment asset uploads plus response-packet and asset download URLs used by the staff UI.
- Server-backed queue views and recommended defaults support staff form review workflows without turning the case module into a generic workflow builder.

### Portal And Messaging Adjacencies

- Case-specific portal conversation listing plus reply and resolve actions for staff.
- Tokenized public case-form routes used for client submission and follow-through.

## Permissions And Scope

- Staff case routes require authentication and an active organization context before the case router is reached.
- Mutating case routes typically require `Permission.CASE_EDIT`.
- Case creation and deletion keep their narrower permission gates: `Permission.CASE_CREATE` and `Permission.CASE_DELETE`.
- Client-visible notes, outcomes, documents, and case access stay off by default and must meet the sharing rules documented in [CASE_CLIENT_VISIBILITY_AND_FILES.md](CASE_CLIENT_VISIBILITY_AND_FILES.md).

## Key Mounted API Families

### Catalog And Lifecycle

- `GET /api/v2/cases/summary`
- `GET /api/v2/cases/types`
- `GET /api/v2/cases/statuses`
- `GET /api/v2/cases`
- `POST /api/v2/cases`
- `GET /api/v2/cases/:id`
- `PUT /api/v2/cases/:id`
- `DELETE /api/v2/cases/:id`
- `PUT /api/v2/cases/:id/status`
- `PUT /api/v2/cases/:id/reassign`
- `POST /api/v2/cases/bulk-status`

### Case Detail Resources

- `GET /api/v2/cases/:id/timeline`
- `GET /api/v2/cases/:id/notes`
- `POST /api/v2/cases/notes`
- `PUT /api/v2/cases/notes/:noteId`
- `DELETE /api/v2/cases/notes/:noteId`
- `GET /api/v2/cases/outcomes/definitions`
- `GET /api/v2/cases/:id/outcomes`
- `POST /api/v2/cases/:id/outcomes`
- `PUT /api/v2/cases/:id/outcomes/:outcomeId`
- `DELETE /api/v2/cases/:id/outcomes/:outcomeId`
- `GET /api/v2/cases/:id/documents`
- `POST /api/v2/cases/:id/documents`
- `GET /api/v2/cases/:id/documents/:documentId/download`
- `PUT /api/v2/cases/:id/documents/:documentId`
- `DELETE /api/v2/cases/:id/documents/:documentId`
- `GET /api/v2/cases/:id/milestones`
- `POST /api/v2/cases/:id/milestones`
- `PUT /api/v2/cases/:id/milestones/:milestoneId`
- `DELETE /api/v2/cases/:id/milestones/:milestoneId`
- `GET /api/v2/cases/:id/relationships`
- `POST /api/v2/cases/:id/relationships`
- `PUT /api/v2/cases/:id/relationships/:relationshipId`
- `DELETE /api/v2/cases/:id/relationships/:relationshipId`
- `GET /api/v2/cases/:id/services`
- `POST /api/v2/cases/:id/services`
- `PUT /api/v2/cases/:id/services/:serviceId`
- `DELETE /api/v2/cases/:id/services/:serviceId`
- `GET /api/v2/cases/:id/reassessments`
- `POST /api/v2/cases/:id/reassessments`
- `PATCH /api/v2/cases/:id/reassessments/:reassessmentId`
- `POST /api/v2/cases/:id/reassessments/:reassessmentId/complete`
- `POST /api/v2/cases/:id/reassessments/:reassessmentId/cancel`

### Forms And Portal Conversation Support

- `GET /api/v2/cases/:id/forms`
- `GET /api/v2/cases/types/:caseTypeId/forms/defaults`
- `POST /api/v2/cases/types/:caseTypeId/forms/defaults`
- `PUT /api/v2/cases/types/:caseTypeId/forms/defaults/:defaultId`
- `GET /api/v2/cases/:id/forms/recommended-defaults`
- `POST /api/v2/cases/:id/forms`
- `GET /api/v2/cases/:id/forms/:assignmentId`
- `PUT /api/v2/cases/:id/forms/:assignmentId`
- `POST /api/v2/cases/:id/forms/defaults/:defaultId/instantiate`
- `POST /api/v2/cases/:id/forms/:assignmentId/assets`
- `POST /api/v2/cases/:id/forms/:assignmentId/draft`
- `POST /api/v2/cases/:id/forms/:assignmentId/staff-submit`
- `POST /api/v2/cases/:id/forms/:assignmentId/send`
- `POST /api/v2/cases/:id/forms/:assignmentId/review`
- `GET /api/v2/cases/:id/forms/:assignmentId/response-packet`
- `GET /api/v2/cases/queue-views`
- `POST /api/v2/cases/queue-views`
- `DELETE /api/v2/cases/queue-views/:viewId`
- `GET /api/v2/cases/:id/portal/conversations`
- `POST /api/v2/cases/:id/portal/conversations/:threadId/messages`
- `POST /api/v2/cases/:id/portal/conversations/:threadId/resolve`

## Current Source Files

- Backend router: `backend/src/modules/cases/routes/index.ts`
- Public case-form routes: `backend/src/modules/cases/routes/public.ts`
- Staff UI: `frontend/src/features/cases/**`
- Mounted route catalog: `frontend/src/routes/engagementRoutes.tsx`

## Related Docs

- [FEATURE_MATRIX.md](FEATURE_MATRIX.md)
- [CASE_CLIENT_VISIBILITY_AND_FILES.md](CASE_CLIENT_VISIBILITY_AND_FILES.md)
- [FOLLOW_UP_LIFECYCLE.md](FOLLOW_UP_LIFECYCLE.md)
- [../api/API_REFERENCE_PORTAL_APPOINTMENTS.md](../api/API_REFERENCE_PORTAL_APPOINTMENTS.md)
