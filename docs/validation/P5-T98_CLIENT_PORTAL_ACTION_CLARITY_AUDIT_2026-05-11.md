# P5-T98 Client Portal Action-Clarity Audit And Enhancement

**Date:** 2026-05-11  
**Status:** Review  
**Workboard row:** [P5-T98](../phases/planning-and-progress.md)

## Scope

This lane audited the client portal surface for action clarity and implemented the first broad enhancement without changing portal route URLs or reviving the older read-only forms endpoint for interactive form work.

Included:

- Authenticated client portal routes: `/portal`, `/portal/profile`, `/portal/people`, `/portal/calendar`, `/portal/events`, `/portal/messages`, `/portal/cases`, `/portal/cases/:id`, `/portal/appointments`, `/portal/documents`, `/portal/notes`, `/portal/forms`, and `/portal/reminders`.
- Public portal/token routes: `/portal/login`, `/portal/signup`, `/portal/forgot-password`, `/portal/reset-password/:token`, `/portal/accept-invitation/:token`, and `/public/case-forms/:token`.
- Portal-admin oversight routes under `/settings/admin/portal/*`.

## Audit Findings

1. `/portal` had useful cards and quick actions, but the first screen did not clearly answer "what needs my attention now" across forms, messages, appointments, cases, and documents.
2. `/portal/forms` already used the canonical assignment-backed inbox, but dashboard links could not open a specific assignment directly.
3. Submitted and revision-requested form states were behaviorally correct, but dashboard-level summaries did not surface them as active client tasks.
4. Public portal auth routes and portal-admin routes remain route-cataloged and covered by existing visibility/link audit tests; this lane did not find a blocker that required widening into auth or admin backend behavior.

## Implementation Summary

- Extended `GET /api/v2/portal/dashboard` with a backward-compatible `action_items` array.
- Built dashboard action items from existing portal-safe data:
  - active, submitted, and revision-requested form assignments delivered to the portal
  - unread portal message threads
  - the next requested or confirmed appointment
  - recently shared portal documents and client-visible case activity
- Added a "Needs Attention" action hub above the existing dashboard stats and quick actions.
- Added assigned-form quick action visibility when the dashboard has form action items.
- Added `/portal/forms?assignment=<id>` handling so dashboard action links can open the intended assignment.
- Added `/portal/messages?thread=<id>&case=<id>` handling so unread-message action items can open the intended conversation and mark it read.
- Added `/portal/appointments?appointment=<id>&case=<id>` handling so appointment action items can preserve case context and visually flag the linked appointment.
- Preserved the canonical `/api/v2/portal/forms/assignments*` contract for interactive forms.

## Validation Proof

- Pass: `cd backend && npx jest src/modules/portal/repositories/__tests__/portalRepository.dashboardActions.test.ts --runInBand` (1 suite, 3 tests; rerun 2026-05-12).
- Pass: `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalDashboardPage.test.tsx` (1 file, 7 tests; 2026-05-12 action-only and action-kind CTA follow-up).
- Pass: `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalDashboardPage.test.tsx src/features/portal/pages/__tests__/PortalFormsPage.test.tsx src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx` (3 files, 17 tests; 2026-05-12).
- Pass: `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx src/features/portal/pages/__tests__/PortalDashboardPage.test.tsx` (2 files, 6 tests; appointment deep-link follow-up).
- Pass: `cd frontend && npm run type-check`.
- Pass: `cd frontend && npm run lint`.
- Pass: `cd backend && npm run type-check`.
- Pass: `node scripts/check-route-catalog-drift.ts`.
- Pass: `cd e2e && npm test -- --project=chromium tests/visibility-link-audit.spec.ts --grep "portal navigation links stay visible and canonical"` (1 Chromium test; the stale E2E lock was cleared by the wrapper).
- Superseded blocker note: the original 2026-05-11 wrapper and Playwright blockers were caused by Docker being unavailable. On 2026-05-12, Docker responds locally with version `29.4.3`, `/tmp/nonprofit-manager-e2e.lock` is no longer present after the focused wrapper run, and the narrow portal navigation-link proof passed.

## 2026-05-12 Remediation Follow-Up

- `P5-T98` was reopened for the action-only dashboard empty-state gap and action-kind-aware Needs Attention CTA follow-up.
- The dashboard now treats `action_items` as content so action-only dashboards do not render the page-level empty state.
- The Needs Attention section CTA now follows the highest-priority action kind: forms, messages, appointments, documents, cases, and mixed first-action sets have focused labels and routes instead of the generic form CTA.
- Focused component, backend action, frontend type-check/lint, and narrow host Playwright proof are complete; the row is ready for review.

## Follow-Up Notes

- The narrow host Playwright portal-navigation proof has passed. A broader portal browser sweep across `/portal/forms`, `/portal/messages`, `/portal/appointments`, `/portal/login`, and `/settings/admin/portal/access` can be opened separately if the next review wants expanded browser coverage.
- Future portal depth work should be opened as separate rows when it requires new client workflow capability, new persistence, or portal-admin behavior changes.
