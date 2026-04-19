# P4-T9 Startup Request Map (`/login` -> `/dashboard` -> `/contacts`)

**Last Updated:** 2026-04-19


Date: 2026-03-05  
Task: `P4-T9D` (load-time acceleration refactor)

## Before (P4-T9D baseline)

| Route | Startup requests observed/required |
|---|---|
| `/login` | `GET /api/v2/auth/setup-status`, `GET /api/v2/auth/me`, `POST /api/v2/auth/login` |
| `/dashboard` | `GET /api/v2/auth/me`, `GET /api/v2/auth/preferences`, `GET /api/v2/admin/branding` |
| `/contacts/:id` | `GET /api/v2/contacts/:id`, `GET /api/v2/contacts/:id/notes`, `GET /api/v2/cases` (unscoped global case list fetch) |

## After (P4-T9D)

| Route | Startup/transition requests observed/expected |
|---|---|
| `/login` | Setup gating behavior preserved (`/auth/setup-status` still route-gated only where required). |
| `/dashboard` | Layout/nav shell is persistent across authenticated route transitions; repeated preference/branding fetch churn is guarded (`/auth/preferences` and `/admin/branding` expected at most once per session path). |
| `/contacts/:id` | Contact case data now uses scoped fetch (`GET /api/v2/cases?contact_id=<id>`) instead of unscoped `GET /api/v2/cases`. |
| Dashboard quick lookup | Search now hits `GET /api/v2/contacts/lookup` (minimal payload) instead of broad contacts list search path. |

## Evidence pointers

- Persistent auth shell: `frontend/src/components/auth/AuthenticatedShellRoute.tsx`, `frontend/src/routes/index.tsx`
- Preference fetch dedupe/cache: `frontend/src/hooks/useNavigationPreferences.ts`
- Contact scoped case fetch: `frontend/src/features/cases/state/casesCore.ts`, `frontend/src/pages/people/contacts/ContactDetail.tsx`
- Quick lookup endpoint usage: `frontend/src/components/dashboard/useQuickLookup.tsx`, `frontend/src/features/contacts/api/contactsApiClient.ts`
- Assertions:
- `e2e/tests/auth.spec.ts` (`authenticated route transitions do not repeatedly refetch preferences/branding`, `quick lookup uses lookup endpoint instead of full contacts list search`)
  - `e2e/tests/contacts.spec.ts` (`contact detail uses contact scoped case fetch`)

## Current Staff Bootstrap Targets (Mar 13, 2026 redesign slice)

| Route | Targeted startup/transition requests |
|---|---|
| `/login` -> `/dashboard` | `POST /api/v2/auth/login`, `GET /api/v2/auth/bootstrap`; no `/auth/preferences` or `/admin/branding` request after auth resolves |
| `/dashboard` -> `/contacts` | Code-prefetch only before intent/idle; first navigation may fetch contacts page data, but should not refetch `/auth/preferences` or `/admin/branding` |

Active guardrails now live in `docs/performance/p4-t9d-thresholds.json` and `e2e/tests/performance.startup.spec.ts`.
