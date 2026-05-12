# Phase 5 Review Subagent Wave Closeout

**Date:** 2026-05-09
**Updated:** 2026-05-11

This artifact preserves the closeout for proof-complete rows from the May 9 validation-only review wave, the May 10 remaining-blocker wave, and the May 11 main-merge reconciliation. The wave covered the original 26 live `Review` rows and kept `P5-T75` as a time-gated blocker.

Current validation details and blockers live in [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md).

## Removed Rows

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T63` | Removed from live board; preview bootstrap fake-auth removal and real login-response cache seeding revalidated. | [../../validation/P5-T63_PREVIEW_BOOTSTRAP_AUTH_HARDENING_PROOF_2026-05-05.md](../../validation/P5-T63_PREVIEW_BOOTSTRAP_AUTH_HARDENING_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T64` | Removed from live board; Mailchimp cancel/reschedule unsupported-contract proof revalidated. | [../../validation/P5-T64_MAILCHIMP_CANCEL_RESCHEDULE_CONTRACT_PROOF_2026-05-05.md](../../validation/P5-T64_MAILCHIMP_CANCEL_RESCHEDULE_CONTRACT_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T65` | Removed from live board; strict outcomes report query contract proof revalidated. | [../../validation/P5-T65_OUTCOMES_REPORT_PROGRAM_ID_CONTRACT_PROOF_2026-05-05.md](../../validation/P5-T65_OUTCOMES_REPORT_PROGRAM_ID_CONTRACT_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T67` | Removed from live board; historical verification-helper routing and tooling contracts revalidated. | [../../validation/P5-T67_LEGACY_VERIFICATION_REHOME_PROOF_2026-05-05.md](../../validation/P5-T67_LEGACY_VERIFICATION_REHOME_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T70` | Removed from live board; local campaign failed-recipient retry route/service proof revalidated. | [../../validation/P5-T70_LOCAL_CAMPAIGN_FAILED_RECIPIENT_RETRY_PROOF_2026-05-05.md](../../validation/P5-T70_LOCAL_CAMPAIGN_FAILED_RECIPIENT_RETRY_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T72` | Removed from live board; support-letter preview/copy/download proof revalidated. | [../../validation/P5-T72_T73_WEBSITE_CONSOLE_PUBLIC_ACTION_POLISH_PROOF_2026-05-05.md](../../validation/P5-T72_T73_WEBSITE_CONSOLE_PUBLIC_ACTION_POLISH_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T73` | Removed from live board; public event and self-referral operational snapshots proof revalidated. | [../../validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md](../../validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T74` | Removed from live board; recurring donation provider-management parity proof revalidated. | [../../validation/P5-T74_RECURRING_DONATION_PROVIDER_MANAGEMENT_PROOF_2026-05-05.md](../../validation/P5-T74_RECURRING_DONATION_PROVIDER_MANAGEMENT_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T76` | Removed from live board; browser-session diagnostics proof revalidated. | [../../validation/P5-T76_BROWSER_SESSION_DIAGNOSTICS_PROOF_2026-05-05.md](../../validation/P5-T76_BROWSER_SESSION_DIAGNOSTICS_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T79`-`P5-T84` | Removed from live board; auth, portal/pending-account, accounts/RLS, case-form mapping, public-action transition, and volunteer approval remediation proof revalidated. | [../../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T86`-`P5-T89` | Removed from live board; tenant/session boundary, ingress/rate-limit, production security, dependency, and image-policy proof revalidated. | [../../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md](../../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |

## Removed Rows - 2026-05-10 Remaining-Blocker Wave

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T71` | Removed from live board; stale host E2E cache/DB state was repaired and Chromium public workflow proof passed. | [../../validation/P5-T71_PUBLIC_WORKFLOW_BROWSER_PROOF_2026-05-05.md](../../validation/P5-T71_PUBLIC_WORKFLOW_BROWSER_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T78` | Removed from live board; host Chromium public workflow and starter public-site proof passed after fixture recovery. | [../../validation/P5-T78_PUBLIC_ACTION_BLOCK_SUBMISSION_REGRESSION_PROOF_2026-05-05.md](../../validation/P5-T78_PUBLIC_ACTION_BLOCK_SUBMISSION_REGRESSION_PROOF_2026-05-05.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T85` | Removed from live board; stale board text was reconciled against the newer proof showing fresh Docker review stack, full desktop matrix, exact Firefox rerun, mobile tail, and Docker audit pass. | [../../validation/P5-T85_DOCKER_STACK_EFFICIENCY_PROOF_2026-05-06.md](../../validation/P5-T85_DOCKER_STACK_EFFICIENCY_PROOF_2026-05-06.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T90` | Removed from live board; volunteer service is now under the implementation-size cap and focused volunteer approval DB proof passed. | [../../validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md](../../validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T91` | Removed from live board; queue-view route registrar no longer imports `express-serve-static-core` directly and focused queue-view proof passed. Residual unrelated Knip findings were resolved under `P5-T94`. | [../../validation/P5-T91_QUEUE_VIEW_MODULARITY_PROOF_2026-05-08.md](../../validation/P5-T91_QUEUE_VIEW_MODULARITY_PROOF_2026-05-08.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T92` | Removed from live board; explicit reject-click proof was added for the forms-console staff transition controls and focused website/type/lint/contracts proof passed. | [../../validation/P5-T92_PUBLIC_ACTION_STAFF_TRANSITIONS_FOLLOWUP_PROOF_2026-05-09.md](../../validation/P5-T92_PUBLIC_ACTION_STAFF_TRANSITIONS_FOLLOWUP_PROOF_2026-05-09.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |

## Removed Rows - 2026-05-11 Main-Merge Reconciliation

| Row | Disposition | Evidence |
|---|---|---|
| `P5-T93` | Removed from live board; the safe dependency refresh, testing-strategy overhaul, and case-form authoring diagnostics follow-through are merged on `main`, including the fixed single-checkbox diagnostic and focused Vitest proof. | [../../validation/P5-T93_SAFE_CURRENT_DEPENDENCY_REFRESH_PROOF_2026-05-09.md](../../validation/P5-T93_SAFE_CURRENT_DEPENDENCY_REFRESH_PROOF_2026-05-09.md), [../../validation/P5-T93_TESTING_STRATEGY_OVERHAUL_PROOF_2026-05-09.md](../../validation/P5-T93_TESTING_STRATEGY_OVERHAUL_PROOF_2026-05-09.md), [../../validation/P5-T93_CASE_FORM_AUTHORING_DIAGNOSTICS_PROOF_2026-05-10.md](../../validation/P5-T93_CASE_FORM_AUTHORING_DIAGNOSTICS_PROOF_2026-05-10.md) |
| `P5-T94` | Removed from live board; Mailchimp campaign-dialog modularity, scoped semantic cleanup, Knip, lint, and typecheck gate proof are merged on `main`. | [../../validation/P5-T94_MAILCHIMP_MODULARITY_GATE_CLEANUP_PROOF_2026-05-10.md](../../validation/P5-T94_MAILCHIMP_MODULARITY_GATE_CLEANUP_PROOF_2026-05-10.md), [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) |
| `P5-T95` | Removed from live board; worker container parity and hardening proof is merged on `main`, and no separate review target remains. | [../../validation/P5-T95_WORKER_CONTAINER_PARITY_PROOF_2026-05-10.md](../../validation/P5-T95_WORKER_CONTAINER_PARITY_PROOF_2026-05-10.md) |
| `P5-T96` | Removed from live board; small-VPS runtime and queued export refactor proof is merged on `main`, including host-side and Docker runtime evidence. | [../../validation/P5-T96_SMALL_VPS_RUNTIME_EXPORT_PROOF_2026-05-10.md](../../validation/P5-T96_SMALL_VPS_RUNTIME_EXPORT_PROOF_2026-05-10.md) |
| `P5-T97` | Removed from live board; controller helper modularity proof is merged on `main`, and no separate review target remains. | [../../validation/P5-T97_CONTROLLER_HELPER_MODULARITY_PROOF_2026-05-10.md](../../validation/P5-T97_CONTROLLER_HELPER_MODULARITY_PROOF_2026-05-10.md) |

## Rows Still Live

- `P5-T6` remains live as the Phase 5 backlog scope-control gate.
- `P5-T75` remains blocked by the auth-alias telemetry calendar.

## Validation

- `make typecheck` passed.
- `make check-links` passed with 215 files and 1400 local links after lead closeout docs were updated.
- `git diff --check` passed.
- `cd frontend && npm run lint` passed.
- Earlier May 10 lead gates exposed the residual Mailchimp/Knip and UI audit drift that was resolved under `P5-T94`; [../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md](../../validation/P5_REVIEW_SUBAGENT_WAVE_REVALIDATION_2026-05-09.md) records the later passing Knip, lint, and typecheck proof.
- 2026-05-11 docs reconciliation: `make check-links` passed with 221 files and 1425 local links, and `git diff --check` passed after removing stale review state from the live board, closeout note, and validation index.
