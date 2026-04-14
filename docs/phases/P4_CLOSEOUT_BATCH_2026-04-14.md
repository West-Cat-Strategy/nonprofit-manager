# Phase 4 Review-Row Closure Batch

**Date:** 2026-04-14

This artifact preserves the proof chain for the completed Phase 4 review rows removed from the live workboard on 2026-04-14.

## Summary

- Closed the completed review-row batch so [planning-and-progress.md](planning-and-progress.md) returns to active work only.
- Preserved shared modularity proof in [P4-T1_CLOSEOUT_2026-04-13.md](P4-T1_CLOSEOUT_2026-04-13.md) and [P4-T1R4C_CLOSEOUT_2026-04-13.md](P4-T1R4C_CLOSEOUT_2026-04-13.md), with explicit 2026-04-14 addenda for the newly removed rows.
- Left the deferred auth-alias operational follow-up visible as `P4-T9I`; [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md) remains the source artifact for that work.

## Closed Rows By Evidence Cluster

### Efficiency, Reliability, And Maintenance

- `P4-T9A`: closed with [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), plus live alias telemetry middleware at `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts` and coverage at `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`; deferred dashboard/query work now lives under `P4-T9I`.
- `P4-T9E`: startup guard closure stands on the 2026-04-14 Docker-backed Chromium rerun after tightening the request counter to backend API traffic only.
- `P4-T18`: provider-aware donation settings, public website form handling, integrations/forms UI, builder defaults, and the 2026-04-14 publishing/public endpoint validation remain the closure evidence on `main`.
- `P4-T29`: frontend grants coverage, the passing backend integration slice under the isolated test database contract, and the green Docker-backed grants smoke rerun remain sufficient closure proof.
- `P4-T39` and `P4-T39A`: shared 2026-04-14 reliability evidence across backend webhooks/reconciliation tests and the retry/error Chromium slice stays concrete enough to close both rows; `P4-T39A` remains attributable to the backend-only evidence chain.
- `P4-T16A`: `data-intake` is retired, `csv-writer` is gone, and the remaining `otplib` work stays split to `P4-T16B`.
- `P4-T9G`: the grouped list-page sanitization specs were rerun on 2026-04-14 and all four passed, matching the row claim.

### Messaging, Portal, Website, And UX Surfaces

- `P4-T4F`: commit `63f59c76` remains the row-specific reporting closure artifact.
- `P4-T4G`: commit `5584f499` remains the row-specific team messenger split closure artifact.
- `P4-T6C`: portal core page changes plus `e2e/tests/portal-workspace.spec.ts` remain the direct verification path.
- `P4-T7A`, `P4-T7B`, `P4-T7C-ADMIN-UX`, and `P4-T7H`: the nav/theme/admin commit cluster and the updated tests/E2E remain aligned with the row wording.
- `P4-T7C-EVTPUB`, `P4-T7C-WEB2`, `P4-T7C-WEB3`, and `P4-T33`: website/public runtime/site console work keeps its direct commit/test evidence, and the current repo state still matches the claims.
- `P4-T7C-PROFILE`, `P4-T7E-INPUT`, `P4-T7E-STAFFQA`, and `P4-T7E-VALID`: targeted tests and QA artifacts remain strong and still match the row wording closely.
- `P4-T7D`: the portal/auth/public page migration keeps its clear commit trail and matching portal/setup coverage.
- `P4-T36`: the email-marketing/admin-route fixes have concrete file and test evidence on `main`.
- `P4-T43`: contacts-owned case/reminder adapters now replace the direct contacts->cases imports at the targeted seams, with matching contacts tests and frontend type-check evidence on 2026-04-14.

### Repo-Local Contributor Workflow

- `P4-T34`: the repo-local skill suite exists under `.codex/skills`, is tracked, and contributor docs reference it.
- `P4-T42`: the rebuild/maintenance follow-on to `P4-T34` is now concrete on `main`; `.gitignore` re-includes `.codex/skills/**`, `git ls-files .codex/skills` lists the repo-local suite, and contributor docs treat the in-repo skills as versioned workflow guidance.

### Shared Modularity Closeouts

- `P4-T1`, `P4-T1R7`, `P4-T1R7A`, `P4-T1R7B`, `P4-T1R7C`, `P4-T1R7D`, and `P4-T1R4W3G`: close via [P4-T1_CLOSEOUT_2026-04-13.md](P4-T1_CLOSEOUT_2026-04-13.md), with the live tree still matching its compatibility notes (`backend/src/routes` contains only `health.ts` and `v2/`; `frontend/src/pages` remains empty).
- `P4-T1R4A` and `P4-T1R4C`: close via [P4-T1R4C_CLOSEOUT_2026-04-13.md](P4-T1R4C_CLOSEOUT_2026-04-13.md), which now explicitly covers the paired wave-2 backend row alongside the `/api/v2/*` contract-alignment row.
- `P4-T1R4B`, `P4-T1R8`, `P4-T1R8A`, and `P4-T1R8B`: feature-owned route components are in place, legacy `frontend/src/pages/**` wrappers are gone, and route/store tests back the current tree.
- `P4-T1R4D`: the seeded `P4-T1R4W3A` through `P4-T1R4W3G` subrows remain the retained artifact for the planning/decision-lock row even though the parent row is now removed from the active board.

## Rows Removed From The Live Workboard

- `P4-T9A`, `P4-T9E`, `P4-T18`, `P4-T29`, `P4-T39`, `P4-T39A`, `P4-T43`, `P4-T1`, `P4-T1R4A`, `P4-T1R4B`, `P4-T1R4C`, `P4-T1R4D`, `P4-T1R4W3G`, `P4-T1R7A`, `P4-T1R7B`, `P4-T1R7C`, `P4-T1R7D`, `P4-T1R7`, `P4-T1R8`, `P4-T1R8A`, `P4-T1R8B`, `P4-T4F`, `P4-T4G`, `P4-T6C`, `P4-T7A`, `P4-T7B`, `P4-T7C-ADMIN-UX`, `P4-T7C-EVTPUB`, `P4-T7C-PROFILE`, `P4-T7C-WEB2`, `P4-T7C-WEB3`, `P4-T7D`, `P4-T7E-INPUT`, `P4-T7E-STAFFQA`, `P4-T7E-VALID`, `P4-T7H`, `P4-T9G`, `P4-T16A`, `P4-T33`, `P4-T34`, `P4-T36`, `P4-T42`
