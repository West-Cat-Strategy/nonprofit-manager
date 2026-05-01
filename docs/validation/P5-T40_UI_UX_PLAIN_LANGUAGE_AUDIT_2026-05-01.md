# P5-T40 UI/UX Plain-Language Audit

**Date:** 2026-05-01  
**Status:** Implementation landed; review pending  
**Workboard row:** [P5-T40](../phases/planning-and-progress.md)

## Scope

This note captures the read-only UI/UX review that preceded the implementation pass and the later design direction that iconography and subtle animation should support the cleanup. The cleanup covers eligible pages other than cases and people/contact/account implementation surfaces.

Included:

- Alerts and notifications: alert rules, active alert triage, alert history, user notification preferences, scheduled/saved report delivery feedback, and toast/browser-alert behavior.
- Portal/public pages except portal case detail/list, portal people, and public case-form runtime.
- Staff-facing pages in admin/settings, reports, grants, websites, donations, scheduled reports, analytics, tasks, volunteers, meetings, team chat, and related route/catalog copy.
- Shared empty, loading, error, confirmation, destructive-action, and status/severity presentation patterns.
- Meaningful iconography and restrained motion on primary actions, statuses, empty states, and feedback moments.

Excluded:

- `frontend/src/features/cases/**`
- `frontend/src/features/people/**`
- Contact/account implementation pages, except unavoidable shared navigation wording if a global catalog requires it.

## Findings To Implement

1. Alerts need a contract-safe cleanup before copy becomes personal. Active alert instances should be scoped to alert rules owned by the current user or organization before UI text says "your queue." Acknowledge and resolve actions need pending, success, and error feedback.
2. Alert terminology is inconsistent. Standardize visible labels around `Alert rules`, `Active alerts`, and `Alert history`; reserve `notifications` for delivery preferences and transient app feedback.
3. Scheduled and saved report flows still use blocking browser alerts and confirmations. Replace these with app toasts, inline errors, and the existing confirmation-dialog pattern.
4. Portal pages use internal/staff terms such as `case workspace`, `mime`, `slot booking`, `manual request`, and `response packet`. Use client-first language without hiding existing functionality.
5. Some staff pages expose every control at once. Refocus dense pages on the job to do first, then move secondary controls into existing disclosure or section patterns where safe.
6. Admin/settings labels drift between `Communications`, `Email Marketing`, `Newsletter Campaigns`, `Email Delivery`, and `Mailchimp`. Use `Communications` for campaign work, `Email Delivery` for SMTP/transactional settings, and `Mailchimp` only as an optional provider label.
7. API/Webhooks modals need accessible dialog semantics, labelled controls, focus handling, and clearer result feedback.
8. Empty, loading, and error states should stay distinct. An unavailable backend or failed fetch must not look like an empty list.
9. Iconography should clarify the action or state, not decorate the page. Use familiar icons for actions, statuses, channels, and workflow steps.
10. Motion should be subtle and functional: short transitions, loading/pending feedback, hover/focus affordances, and gentle reveal states. Avoid distracting loops, layout shifts, and motion that hides information.

## Implementation Defaults

- Preserve all existing functionality and routes.
- Prefer plain language over contributor, implementation, or internal project wording.
- Pair iconography with text where meaning is not obvious, and keep accessible labels intact.
- Keep animations short, optional-looking, and based on existing transition utilities where possible.
- Keep changes frontend-first except for the alert instance scoping fix.
- Use existing shared UI components and patterns before adding new abstractions.
- Keep validation focused on touched seams plus route/catalog safety.

## Implementation Summary

- Scoped alert instance list, acknowledge, and resolve operations through the current user's alert rules before using personal queue language.
- Standardized alert UI wording to `Alert rules`, `Active alerts`, and `Alert history`, with clearer channel setup copy and pending/error action feedback.
- Simplified eligible portal pages with client-first language, clearer empty guidance, meaningful icons, and restrained transitions.
- Clarified admin/settings vocabulary around `Admin Hub`, `Admin Tools`, `Communications`, `Email Delivery`, and optional `Mailchimp`; API/Webhooks dialogs now use clearer accessible dialog and feedback patterns.
- Refocused eligible staff pages across reports, grants, websites, donations, scheduled reports, analytics, tasks, volunteers, meetings, and team chat with plainer copy, status iconography, and low-risk progressive disclosure.
- Added website-builder defaults for the new public-action component types so the existing website contract remains type-safe.

## Validation Proof

- Pass: `cd backend && npm test -- alerts.usecase.test.ts alertService.test.ts --runInBand` (2 suites, 16 tests).
- Pass: `cd backend && npm run type-check`.
- Pass: `cd frontend && npm run type-check`.
- Pass: `cd frontend && npm test -- --run src/test/ux/RouteUxSmoke.test.tsx src/test/ux/RouteUxSmokeExtended.test.tsx` (2 files, 39 tests).
- Pass: `cd e2e && npm test -- --project="Mobile Chrome" tests/ux-regression.spec.ts --grep "mobile navigation drawer keeps the compact section layout"` (1 test; revalidated the `Alert rules` mobile header selector after the plain-language rename).
- Pass: `node scripts/check-route-catalog-drift.ts`.
- Pass: `git diff --check`.
- Worker-reported pass: focused alerts, portal, admin/webhooks/navigation, and staff-page frontend suites for touched surfaces.

## Follow-Up Notes

- Browser screenshots remain useful for visual review, especially `/alerts`, `/alerts/instances`, `/reports/scheduled`, `/reports/builder`, `/grants`, `/websites`, `/settings/api`, `/settings/navigation`, `/settings/user`, and representative portal pages.
- Existing dirty Phase 5 work in cases, contacts, communications, website public actions, reference docs, and related migrations was preserved; this cleanup did not revert or sign off those lanes.
