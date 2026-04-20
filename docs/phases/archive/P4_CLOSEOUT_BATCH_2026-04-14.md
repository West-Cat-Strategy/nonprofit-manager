# Phase 4 Review-Row Closure Batch

**Last Updated:** 2026-04-19


**Date:** 2026-04-14

This artifact preserves the proof chain for the completed Phase 4 review rows removed from the live workboard on 2026-04-14.

## Summary

- Closed the completed review-row batch so [../planning-and-progress.md](../planning-and-progress.md) returns to active work only.
- Preserved shared modularity proof in [P4-T1_CLOSEOUT_2026-04-13.md](P4-T1_CLOSEOUT_2026-04-13.md) and [P4-T1R4C_CLOSEOUT_2026-04-13.md](P4-T1R4C_CLOSEOUT_2026-04-13.md), with explicit 2026-04-14 addenda for the newly removed rows.
- Left the deferred auth-alias operational follow-up visible as `P4-T9I`; [../../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md) remains the source artifact for that work.

## Closed Rows By Evidence Cluster

### Efficiency, Reliability, And Maintenance

- `P4-T9A`: closed with [../../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), plus live alias telemetry middleware at `backend/src/modules/auth/middleware/aliasUsageTelemetry.ts` and coverage at `backend/src/__tests__/modules/auth/aliasUsageTelemetry.test.ts`; deferred dashboard/query work now lives under `P4-T9I`.
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

- `P4-T34`: at the 2026-04-14 closeout point, the repo-local skill suite was present in the tree and contributor docs referenced it; the current repo policy has since returned local AI workspace tooling to ignored-only status.
- `P4-T42`: the 2026-04-14 rebuild or maintenance follow-on to `P4-T34` was concrete on `main` at closeout time, but the current repo policy now keeps durable contributor workflow guidance in tracked docs instead of local AI workspace directories.

### Shared Modularity Closeouts

- `P4-T1`, `P4-T1R7`, `P4-T1R7A`, `P4-T1R7B`, `P4-T1R7C`, `P4-T1R7D`, and `P4-T1R4W3G`: close via [P4-T1_CLOSEOUT_2026-04-13.md](P4-T1_CLOSEOUT_2026-04-13.md), with the live tree still matching its compatibility notes (`backend/src/routes` contains only `health.ts` and `v2/`; `frontend/src/pages` remains empty).
- `P4-T1R4A` and `P4-T1R4C`: close via [P4-T1R4C_CLOSEOUT_2026-04-13.md](P4-T1R4C_CLOSEOUT_2026-04-13.md), which now explicitly covers the paired wave-2 backend row alongside the `/api/v2/*` contract-alignment row.
- `P4-T1R4B`, `P4-T1R8`, `P4-T1R8A`, and `P4-T1R8B`: feature-owned route components are in place, legacy `frontend/src/pages/**` wrappers are gone, and route/store tests back the current tree.
- `P4-T1R4D`: the seeded `P4-T1R4W3A` through `P4-T1R4W3G` subrows remain the retained artifact for the planning/decision-lock row even though the parent row is now removed from the active board.

## Second-Wave Addendum

### Rows Removed With Existing Same-Day Evidence

- `P4-T37` and `P4-T38`: closed via [P4-T37_T38_CLOSEOUT_2026-04-14.md](P4-T37_T38_CLOSEOUT_2026-04-14.md), which already captures the targeted frontend/backend validation plus the shared `make ci-full` rerun.
- `P4-T9H`: closed via [P4-T9H_CLOSEOUT_2026-04-14.md](P4-T9H_CLOSEOUT_2026-04-14.md) and its linked performance artifacts.
- `P4-T7C-RPT1`, `P4-T7F`, and `P4-T7G`: the dated 2026-04-13 verification text already attached to the workboard rows remains authoritative enough to close them without a duplicate standalone note; the attempted shared backend integration rerun on 2026-04-14 failed during Jest test-database preparation, so these rows still rely on their existing dated proof rather than a fresh rerun.
- `P4-T6B`: closed via [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md), which records the fresh cases/intake frontend reruns and the remaining cluster decisions.

### Rows Removed With Fresh 2026-04-14 Verification

- `P4-T30`: the dependency-upgrade commits remain recorded in [archive/RELEASE_v0.1.1_2026-04-07.md](archive/RELEASE_v0.1.1_2026-04-07.md), and the current tree now backs the row claim with `cd frontend && npm run type-check`, `cd backend && npm run type-check`, `cd frontend && npm test -- --run src/routes/__tests__/setupRedirects.test.tsx src/features/teamChat/__tests__/TeamMessengerConversationPanel.test.tsx src/features/savedReports/pages/__tests__/PublicReportSnapshot.test.tsx src/features/reports/hooks/__tests__/useWorkflowCoverageReportController.test.tsx src/features/portal/pages/__tests__/PortalCaseDetailPage.test.tsx src/test/ux/RouteUxSmoke.test.tsx src/features/adminOps/pages/adminSettings/hooks/__tests__/adminSettingsHooks.test.ts` (`7` files, `44` tests), `cd frontend && npm test -- --run src/features/accounts/pages/__tests__/AccountListPage.test.tsx src/features/cases/pages/__tests__/CaseListPage.test.tsx src/features/events/pages/__tests__/EventDetailPage.test.tsx src/features/finance/pages/__tests__/DonationListPage.test.tsx` (`4` files, `9` tests), `make build-backend`, and `make build-frontend`.
- `P4-T44`: `bash -n scripts/e2e-playwright.sh scripts/e2e-run-with-lock.sh scripts/lib/common.sh` passed on 2026-04-14, and the current tree still centralizes the shared E2E wrapper through `scripts/e2e-playwright.sh`, `e2e/package.json`, and `Makefile`.
- `P4-T5`: the only remaining blocker cited on the row was the implementation-size drift, and `wc -l frontend/src/features/adminOps/pages/UserSettingsPage.tsx frontend/src/features/adminOps/pages/adminSettings/sections/PortalSection.tsx` returned `930` and `165`, matching the row note exactly.
- `P4-T3B`: `find backend/uploads -maxdepth 2 -type f` returned only `backend/uploads/.gitignore`, so the generated-upload hygiene follow-up no longer needs to remain on the board.
- `P4-T4H` and `P4-T4I`: the current shared composer and team-chat stability proof is concrete after the green `setupRedirects`/`TeamMessengerConversationPanel` rerun in the 7-file frontend slice above, the dedicated `CaseTeamChatPanel` + `CaseDetailTabs` rerun, and the dedicated `PortalWorkflowPages` rerun across the relevant route, staff chat, case chat, and portal messaging surfaces.
- `P4-T13`, `P4-T14`, and `P4-T15`: the current Canadianized admin-settings helpers, the then-current staff manual, and the README-centric contributor path remained aligned with the row wording at closeout time, and `make check-links` passed on 2026-04-14 with no broken active-doc links.
- `P4-T16`: the refreshed dependency state remains visible in `backend/package.json`, `frontend/package.json`, and `e2e/package.json`, while the shared `type-check` and build reruns above stayed green in the current tree.
- `P4-T31`: `make build-backend` and `make build-frontend` both passed on 2026-04-14, and the frontend bundle-budget gate stayed green.
- `P4-T32`: the current case/outcome structure still matches the row wording, and the fresh `CaseListPage` rerun in the 4-file accounts/cases/events/finance slice plus the dedicated `CaseDetailTabs` rerun stayed green alongside the existing dual-model case/outcome docs.

### Rows Left In Review After The Second Wave

- `P4-T7E-DARK` and `P4-T35`: the fresh Docker-backed Playwright reruns both reached the shared admin-bootstrap login step and then failed with `Invalid credentials`, so these rows stay in `Review` until the E2E auth fixture is stable again.
- `P4-T1R4` and `P4-T1R4W3B` through `P4-T1R4W3F`: [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md) records why the current tree still falls short of the remaining modularization row wording.
- `P4-T6`, `P4-T6A`, and `P4-T6D`: [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md) records why those broader UX rows still remain in `Review` even though `P4-T6B` could be removed.
- `P4-T7J` and `P4-T12`: the current tree still matches the broad routing/coverage intent, but this pass did not produce a dedicated row-local closeout artifact strong enough to drop either umbrella row.

## Rows Removed From The Live Workboard

- `P4-T9A`, `P4-T9E`, `P4-T18`, `P4-T29`, `P4-T39`, `P4-T39A`, `P4-T43`, `P4-T1`, `P4-T1R4A`, `P4-T1R4B`, `P4-T1R4C`, `P4-T1R4D`, `P4-T1R4W3G`, `P4-T1R7A`, `P4-T1R7B`, `P4-T1R7C`, `P4-T1R7D`, `P4-T1R7`, `P4-T1R8`, `P4-T1R8A`, `P4-T1R8B`, `P4-T4F`, `P4-T4G`, `P4-T6C`, `P4-T7A`, `P4-T7B`, `P4-T7C-ADMIN-UX`, `P4-T7C-EVTPUB`, `P4-T7C-PROFILE`, `P4-T7C-WEB2`, `P4-T7C-WEB3`, `P4-T7D`, `P4-T7E-INPUT`, `P4-T7E-STAFFQA`, `P4-T7E-VALID`, `P4-T7H`, `P4-T9G`, `P4-T16A`, `P4-T33`, `P4-T34`, `P4-T36`, `P4-T42`
- `P4-T30`, `P4-T37`, `P4-T38`, `P4-T44`, `P4-T5`, `P4-T9H`, `P4-T3B`, `P4-T4H`, `P4-T4I`, `P4-T6B`, `P4-T7C-RPT1`, `P4-T7F`, `P4-T7G`, `P4-T13`, `P4-T14`, `P4-T15`, `P4-T16`, `P4-T31`, `P4-T32`
