# Planning & Progress

**Last Updated:** 2026-05-04

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 18 |
| In Progress | 0 |
| Blocked | 1 |
| Review | 17 |
| Ready | 0 |
| Phase 4 carry-over rows | 0 |
| Recent thread follow-through rows | 0 |

## Start Here

1. Use this file only for tracked work.
2. Check `Recent Thread Follow-through` first when resuming recent interrupted or disposed work.
3. Update the canonical ledger row before editing tracked work if the owner, status, blocker, or next step changed.

## Recent Thread Follow-through

- No unfinished recent thread follow-through is currently tracked. Reopen this overlay only when a disposed or interrupted thread leaves a concrete next action.

## Priority Board

Maintenance rules:

- The canonical ledger sections below are the source of truth.
- Update the snapshot counts and `Ready Next` in the same edit as any row change.
- Do not create summary-only tasks.
- If a task no longer owns a concrete next step, archive its proof and remove it from the live ledger.

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| _None_ | _None_ | _None_ | No row is currently in progress. |

### Review Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P5-T40 | UI/UX plain-language cleanup for eligible non-case/non-people pages | Review the implemented cleanup and proof in [../validation/P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md](../validation/P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md): alerts/notifications scoping and plain copy, portal client wording, admin/settings vocabulary, staff-page simplification, meaningful iconography, subtle animation, route smoke, type-checks, targeted alert tests, and the green Mobile Chrome `Alert rules` E2E selector follow-up. Cases and people/contact/account implementation surfaces remained out of scope. |
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Keep this row live as the Phase 5 backlog scope-control gate. Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), and [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md) to reject unscoped implementation; future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, and generic workflow tooling require separate signed-out rows before runtime work starts. |
| Review | P5-T41 | Case-form template builder, autosave, and SMS/portal/email opening workflow | Implementation is landed with proof in [../validation/P5-T41_CASE_FORM_TEMPLATE_BUILDER_PROOF_2026-05-01.md](../validation/P5-T41_CASE_FORM_TEMPLATE_BUILDER_PROOF_2026-05-01.md). Review the case-form template APIs, migration `114`, staff template/open-form UI, portal/public autosave, Twilio/SMTP delivery behavior, provider-failure retry safety proof, and the remaining frontend builder type-check blocker note before signoff. |
| Review | P5-T42 | Website public-action expansion | Implementation is landed with proof in [../validation/P5-T42_WEBSITE_PUBLIC_ACTION_EXPANSION_PROOF_2026-05-01.md](../validation/P5-T42_WEBSITE_PUBLIC_ACTION_EXPANSION_PROOF_2026-05-01.md). Review migration `115`, public action APIs, blog/campaign content entries, petition/pledge/support-letter submission behavior, staff forms-console action panel, public runtime action blocks, standalone public-site route parity, focused tests, Docker smoke proof, and the noted follow-on approval-count polish. |
| Review | P5-T44 | Typed fund designation and restriction registry | Implementation is landed with proof in [../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md](../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md). Review migration `116`, typed designation API/service behavior, donation and recurring-plan linkage, reporting-safe labels, recurring invoice propagation, finance UI updates, focused tests, type-checks, policy checks, manifest parity, and the Docker-dependent `make db-verify` blocker. |
| Review | P5-T45 | Double opt-in for public newsletter signup | Implementation is landed with proof in [../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md](../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md). Review migration `117`, pending/confirmed signup state, hashed confirmation tokens, generic public signup/confirmation responses, confirmation email links, CRM/provider handoff after confirmation, focused tests, type-checks, policy checks, manifest parity, and the Docker-dependent `make db-verify` blocker. |
| Review | P5-T62 | Meeting minutes draft preview flow | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review the in-app markdown preview, copy/download actions, and focused meeting tests. |
| Review | P5-T63 | Fence preview bootstrap auth modes | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review removal of fake staff/portal authenticated bootstrap modes and production-style bootstrap tests. |
| Review | P5-T64 | Mailchimp campaign-run cancel/reschedule contract cleanup | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review explicit unsupported/405 behavior across Mailchimp and communications campaign-run actions. |
| Review | P5-T65 | Outcomes report `programId` contract cleanup | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review removal of unsupported `programId` filters from validation/types/docs. |
| Review | P5-T67 | Retire or re-home legacy verification scripts | Implementation is landed with proof in [../validation/P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md](../validation/P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md) and [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review compatibility wrappers and selector routing. |
| Review | P5-T70 | Local campaign failed-recipient retry policy | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review operator-triggered failed-recipient retry, requeue metadata, and no automatic send behavior. |
| Review | P5-T71 | Public workflow browser proof sweep | Implementation is landed with proof in [../validation/P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md](../validation/P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md) and [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review focused Chromium browser proof for managed forms, public event registration, donation checkout, and public action blocks. |
| Review | P5-T72 | Support-letter approval delivery/download polish | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review support-letter artifact preview, copy, and download behavior without email delivery. |
| Review | P5-T73 | Public event and self-referral operational snapshots | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review narrow event waitlist/check-in and self-referral status snapshots. |
| Review | P5-T74 | Recurring donation provider-management parity | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review non-Stripe management gates and client-safe 400 responses. |
| Review | P5-T76 | Browser telemetry and operator metrics next slice | Implementation is landed with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). Review frontend-only browser-session diagnostics for route/bootstrap failures. |

### Ready Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| _None_ | _None_ | _None_ | No row is currently ready without an active owner. |

### Blocked Queue

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Blocked | P5-T75 | Auth alias deprecation gate | Time-gated compatibility retirement: before the June 17, 2026 blocker checkpoint, verify alias telemetry ratios/exceptions and publish or defer the cutoff; no snake_case alias removal ships before July 1, 2026 and only after [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md) is satisfied. |

### Ready Next

- Proof-complete and already archived rows have been removed from the live board: `P5-T2A`, `P5-T2B`, `P5-T2C`, `P5-T2D`, `P5-T3`, `P5-T4`, `P5-T5`, `P5-T6A`, `P5-T6B`, `P5-T6C`, `P5-T6C1`, `P5-T6D`, `P5-T7`, `P5-T8`, `P5-T9`, `P5-T10`, and `P5-T11`.
- `P5-T6` remains live as a scope-control gate for later Phase 5 backlog work. Use [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) and [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md) to keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit; typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, and generic workflow tooling require separate signed-out runtime rows.
- `P5-T45` is in review with proof in [../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md](../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md). It adds local pending/confirmed signup state, generic public responses, confirmation email, and a public confirmation endpoint before CRM/provider sync. It does not widen into marketing automation, tracking pixels, preference centers, Mailchimp parity rewrites, reusable segment builders, memberships, appeals, or finance work.
- `P5-T62`, `P5-T63`, `P5-T64`, `P5-T65`, `P5-T67`, `P5-T70`, `P5-T71`, `P5-T72`, `P5-T73`, `P5-T74`, and `P5-T76` are in review with proof in [../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md](../validation/P5_READY_ROW_BATCH_PROOF_2026-05-04.md). This coordinated implementation kept `P5-T6` review-only and `P5-T75` blocked on the calendar/telemetry gate.
- `P5-T44` is in review with proof in [../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md](../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md). Review migration `116`, typed finance designation registry behavior, donation and recurring-plan linkage, reporting-safe labels, recurring invoice propagation, and Docker-dependent `make db-verify` blocker; do not widen into donation batches, memberships, pledges, soft credits, transparent public finance snapshots, maker-checker approval workflows, full GL/fiscal-host parity, or generic workflow tooling.
- `P5-T43` is signed off and archived in [archive/P5_LOCAL_CAMPAIGN_UNSUBSCRIBE_CLOSEOUT_2026-05-02.md](archive/P5_LOCAL_CAMPAIGN_UNSUBSCRIBE_CLOSEOUT_2026-05-02.md), with proof in [../validation/P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md](../validation/P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md). It added local SMTP campaign unsubscribe and `List-Unsubscribe` support without opening broader marketing automation, tracking, Mailchimp parity, preference-center, fundraising, membership, or finance scope.
- `P5-T37`, `P5-T38`, and `P5-T39` are signed off and archived in [archive/P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md](archive/P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md), with proof in [../validation/P5-T37_T39_REFERENCE_IMPROVEMENTS_PROOF_2026-05-01.md](../validation/P5-T37_T39_REFERENCE_IMPROVEMENTS_PROOF_2026-05-01.md). They added local campaign queue controls, staff-only case-form evidence events, scheduled-report health, and audit-log health polish without widening into deferred `P5-T6` backlog scope.
- `P5-T40` is in review after the focused UI/UX plain-language cleanup across eligible non-case/non-people pages. Review [../validation/P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md](../validation/P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md) for the implemented alerts/notifications, portal, admin/settings, staff insights/program-page, iconography, motion, and validation proof; do not widen into cases or people/contact/account implementation surfaces during signoff.
- `P5-T41` is in review with proof in [../validation/P5-T41_CASE_FORM_TEMPLATE_BUILDER_PROOF_2026-05-01.md](../validation/P5-T41_CASE_FORM_TEMPLATE_BUILDER_PROOF_2026-05-01.md). Review the existing-module implementation, migration `114`, reference-only OSS provenance, and the unrelated backend publishing/frontend builder type-check blockers before signoff.
- `P5-T42` is in review with proof in [../validation/P5-T42_WEBSITE_PUBLIC_ACTION_EXPANSION_PROOF_2026-05-01.md](../validation/P5-T42_WEBSITE_PUBLIC_ACTION_EXPANSION_PROOF_2026-05-01.md). Review the public-action foundation on the existing website builder/runtime seams, migration `115`, content-entry generalization, builder action blocks, staff forms-console action panel, public submission behavior, and the documented follow-on E2E/approval-count polish before signoff.
- `P5-T26` through `P5-T32` are signed off and archived in [archive/P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md](archive/P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md), with proof in [../validation/P5-T26_T32_NEWSLETTER_EMAIL_OPERABILITY_PROOF_2026-05-01.md](../validation/P5-T26_T32_NEWSLETTER_EMAIL_OPERABILITY_PROOF_2026-05-01.md). They did not reopen archived `P5-T3`.
- `P5-T33` and `P5-T34` are signed off and archived in [archive/P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md](archive/P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md), with proof in [../validation/P5-T33_T34_CAMPAIGN_REPORTING_SUPPRESSION_PROOF_2026-05-01.md](../validation/P5-T33_T34_CAMPAIGN_REPORTING_SUPPRESSION_PROOF_2026-05-01.md). They added provider reporting metrics and suppression governance without reopening typed appeals, ROI attribution, or automation-canvas scope.
- `P5-T36` is signed off and archived in [archive/P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md](archive/P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md), with proof in [../validation/P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md](../validation/P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md). It made local SMTP-backed queued delivery primary, kept Mailchimp explicit and optional, added provider-neutral communications APIs, preserved Mailchimp compatibility routes, and did not widen into typed appeals, ROI attribution, workflow automation canvas, or unrelated `P5-T6` backlog runtime work.
- `P5-T12`, `P5-T13`, `P5-T14`, `P5-T15`, and `P5-T17` are archived in [archive/P5_CLOSEOUT_PROOF_BATCH_2026-04-28.md](archive/P5_CLOSEOUT_PROOF_BATCH_2026-04-28.md). Their proof lives in [../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](../validation/PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md), [../validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md](../validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md), [../validation/P5-T15_CASE_HANDOFF_PACKET_PROOF_2026-04-28.md](../validation/P5-T15_CASE_HANDOFF_PACKET_PROOF_2026-04-28.md), and [../validation/P5-T17_GITHUB_BUILD_ARTIFACTS_PROOF_2026-04-27.md](../validation/P5-T17_GITHUB_BUILD_ARTIFACTS_PROOF_2026-04-27.md).
- `P5-T18`, `P5-T19`, `P5-T20`, `P5-T21`, `P5-T22`, `P5-T23`, `P5-T24`, and `P5-T25` are signed off and archived in [archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md](archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md).

## Current Phase Shape

- The Phase 5 docs, archive, benchmark, and persona-skill refresh is complete and archived in [archive/P5-T1_CLOSEOUT_2026-04-20.md](archive/P5-T1_CLOSEOUT_2026-04-20.md).
- The shared testing, remediation, persona, website, helper-skill, and planning-only child review rows are signed off and archived in [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md).
- `P5-T5`, `P5-T6C1`, `P5-T6D`, and `P5-T7` are signed off and archived in [archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md). Durable proof notes now live under [../validation/README.md](../validation/README.md), and the API-key/webhooks boundary seam passed targeted backend tests, module-boundary policy, canonical-import policy, and backend type-check.
- `P5-T3` is signed off and archived in [archive/P5-T3_EMAIL_HARDENING_CLOSEOUT_2026-04-25.md](archive/P5-T3_EMAIL_HARDENING_CLOSEOUT_2026-04-25.md). The narrowed Mailchimp route validation, optional webhook secret, and PII-safe webhook logging proof lives in [../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md](../validation/P5-T3_EMAIL_HARDENING_PROOF_2026-04-25.md).
- `P5-T9`, `P5-T10`, and `P5-T11` are signed off and archived in [archive/P5_REVIEW_CLEANUP_PLANNING_CLOSEOUT_2026-04-25.md](archive/P5_REVIEW_CLEANUP_PLANNING_CLOSEOUT_2026-04-25.md); their cleanup implementation rows are signed off separately.
- `P5-T6` remains in `Review` as the Phase 5 backlog scope-control gate. Keep `borrow now`, `queue for P5-T6`, and `reject` decisions explicit while typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, and generic workflow tooling wait for separately scoped rows; the May 1 reference consolidation adds local communications, evidence, volunteer dispatch, workqueue, and finance-governance candidates without authorizing runtime work.
- `P5-T9A`, `P5-T9B`, `P5-T9C`, `P5-T10A`, and `P5-T11A` are signed off and archived in [archive/P5_CLEANUP_WAVE_CLOSEOUT_2026-04-25.md](archive/P5_CLEANUP_WAVE_CLOSEOUT_2026-04-25.md), with proof in [../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md](../validation/P5_CLEANUP_WAVE_PROOF_2026-04-25.md).
- `P5-T12`, `P5-T13`, `P5-T14`, `P5-T15`, and `P5-T17` are signed off and archived in [archive/P5_CLOSEOUT_PROOF_BATCH_2026-04-28.md](archive/P5_CLOSEOUT_PROOF_BATCH_2026-04-28.md).
- `P5-T18`, `P5-T19`, `P5-T20`, `P5-T21`, `P5-T22`, `P5-T23`, `P5-T24`, and `P5-T25` are signed off and archived in [archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md](archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md).
- `P5-T26` through `P5-T32` are signed off and archived in [archive/P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md](archive/P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md). `P5-T33` and `P5-T34` are signed off and archived in [archive/P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md](archive/P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md). `P5-T6` remains live.
- The current hardening and reassessment migrations `103` through `110` cover saved audiences/campaign runs, public-intake resolution audit, queue view definitions, portal escalations, donor profiles, case reassessment cycles, case-form revision requests, and communication suppression governance; keep `make db-verify` in the validation path whenever those contracts or manifest/initdb parity change.
- `P5-T36` is signed off and archived in [archive/P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md](archive/P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md). `P5-T6` remains the only live row.
- `P5-T37`, `P5-T38`, and `P5-T39` are signed off and archived in [archive/P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md](archive/P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md). `P5-T6` remains in review as the scope-control gate and is not an implementation row.
- `P5-T43` is signed off and archived in [archive/P5_LOCAL_CAMPAIGN_UNSUBSCRIBE_CLOSEOUT_2026-05-02.md](archive/P5_LOCAL_CAMPAIGN_UNSUBSCRIBE_CLOSEOUT_2026-05-02.md). `P5-T6` remains the scope-control gate for any broader communications/fundraising work.
- `P5-T44` is in review as the typed fund designation/restriction foundation recommended by the May 2 reference-repo triage. The row is intentionally prerequisite-only: typed designation records, donation/recurring-plan linkage, reporting-safe labels, focused donation/recurring-plan proof, and database verification when Docker is available.

## Review Row: P5-T45 Double Opt-In Newsletter Signup

- Goal: require a local confirmation step before public newsletter signups create/update CRM newsletter state or sync to an external newsletter provider.
- Owned paths: `database/migrations/117_local_newsletter_double_opt_in.sql`, `database/migrations/manifest.tsv`, `database/initdb/000_init.sql`, `backend/src/services/publishing/publicWebsiteFormService.ts`, `backend/src/services/emailService.ts`, `backend/src/modules/publishing/routes/public.ts`, `backend/src/modules/publishing/controllers/**`, focused publishing/newsletter backend tests, `docs/validation/**`, and this workboard.
- Forbidden scope: marketing automation, tracking pixels, bounce/complaint ingestion, preference-center UI, Mailchimp parity rewrites, reusable segment builders, typed appeals, memberships, donation batches, finance snapshots, and generic workflow tooling.
- Disposition: `Review`; implementation proof is recorded in [../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md](../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md).
- Expected remaining proof: `make db-verify` remains blocked until Docker is reachable at `/Users/bryan/.docker/run/docker.sock`; focused tests, type-checks, policy checks, manifest policy, and backend lint passed during the May 2 implementation pass.

## Review Row: P5-T44 Typed Fund Designations

- Goal: replace free-text designation usage in donations and recurring donation plans with organization-scoped typed designation records while preserving existing donation creation, editing, listing, summary, recurring sync, and tax receipt behavior.
- Disposition: `Review`; implementation proof is recorded in [../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md](../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md).
- Expected remaining proof: `make db-verify` remains blocked until Docker is reachable at `/Users/bryan/.docker/run/docker.sock`; focused tests, type-checks, policy checks, and manifest policy passed during the May 2 review pass.

## Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- Coordinated exception, 2026-05-04: `P5-T62`, `P5-T63`, `P5-T64`, `P5-T65`, `P5-T67`, `P5-T70`, `P5-T71`, `P5-T72`, `P5-T73`, `P5-T74`, and `P5-T76` are implemented as a clean-worktree ready-row batch. The dirty `main` checkout remains untouched; `P5-T6` stays review-only scope control, and `P5-T75` stays blocked on the June 17, 2026 telemetry checkpoint and July 1, 2026 earliest enforcement date.
  Lead: Codex
  Frontend lanes: `meetings-bootstrap-preview`
  Backend lanes: `mailchimp-outcomes-recurring-contracts`, `local-campaign-retry`
  Tooling/browser-proof lanes: `verification-browser-proof`
  Public/operator lanes: `support-event-selfreferral-telemetry`
  Integration owner: Codex
  Proof: row-local validation notes under `docs/validation/**` plus final command synthesis in this workboard.
- Lane: `meetings-bootstrap-preview`
  Goal: replace the meeting minutes placeholder with in-app markdown preview/copy/download behavior and remove fake-authenticated bootstrap modes.
  Owned paths: `frontend/src/features/meetings/**`, `frontend/src/services/bootstrap/**`, `frontend/.env.example`, focused frontend tests
  Forbidden shared paths: backend auth/session behavior, backend meeting generation, database migrations, route catalog rewrites, docs except lead integration
  Expected tests: focused meeting detail and bootstrap tests, `cd frontend && npm run type-check`, `cd frontend && npm run lint`, and `git diff --check`
  Docs ownership: lead
- Lane: `mailchimp-outcomes-recurring-contracts`
  Goal: make Mailchimp cancel/reschedule explicitly unsupported, remove unsupported outcomes `programId`, and gate non-Stripe recurring donation management mutations with 400-level responses.
  Owned paths: `backend/src/modules/mailchimp/**`, `backend/src/modules/communications/**` only for Mailchimp facade behavior, `backend/src/modules/reports/**`, `backend/src/validations/outcomeImpact.ts`, `backend/src/types/outcomes.ts`, `frontend/src/types/outcomes.ts`, `backend/src/modules/recurringDonations/**`, focused backend tests, API docs if contract wording changes
  Forbidden shared paths: local campaign retry semantics, frontend recurring donation redesign, database migrations, broad provider rewrites, docs except lead integration
  Expected tests: focused Mailchimp/communications, outcomes report, and recurring donation tests, `cd backend && npm run type-check`, touched-file lint where practical, and `git diff --check`
  Docs ownership: lead
- Lane: `verification-browser-proof`
  Goal: re-home legacy verification wrappers onto current `make`/selector contracts and add focused browser proof for the public workflow follow-up.
  Owned paths: `scripts/verify.sh`, `scripts/verify-pr.sh`, `docs/verification/VERIFICATION_SYSTEM.md`, `scripts/README.md`, `scripts/tests/tooling-contracts.test.cjs`, focused E2E specs/fixtures, validation proof notes
  Forbidden shared paths: runtime app behavior, hosted CI reinstatement, broad E2E wrapper rewrites, deployment scripts, public runtime feature changes
  Expected tests: `make test-tooling`, `./scripts/select-checks.sh --mode fast`, focused Playwright proof, `make check-links`, and `git diff --check`
  Docs ownership: lead
- Lane: `local-campaign-retry`
  Goal: add operator-triggered failed-recipient retry for local-email campaign runs by requeueing failed recipients, clearing failure messages, and recording retry metadata in existing run counts.
  Owned paths: `backend/src/modules/communications/**`, focused communications tests, optional API docs for the new staff action
  Forbidden shared paths: Mailchimp parity, tracking pixels, marketing automation, public APIs beyond the staff communications route, frontend UI unless needed for existing operator visibility, database migrations unless unavoidable
  Expected tests: focused communications service/route tests, `cd backend && npm run type-check`, route validation policy if route shape changes, and `git diff --check`
  Docs ownership: lead
- Lane: `support-event-selfreferral-telemetry`
  Goal: add support-letter approval artifact preview/download/copy, narrow public event/self-referral operational snapshots, and frontend-only browser-session operator diagnostics.
  Owned paths: publishing/public-action staff review seams, support-letter frontend UI, public event/self-referral selected frontend/backend seams, telemetry-facing frontend bootstrap or route surfaces, focused tests
  Forbidden shared paths: petition counts, public dashboards, workflow/queue infrastructure, broad admin table rewrites, backend telemetry API contracts, database migrations, donation checkout changes, generic analytics surfaces
  Expected tests: focused support-letter/public-event/self-referral/telemetry tests, relevant type-checks, frontend lint where touched, and `git diff --check`
  Docs ownership: lead
- Coordinated exception, 2026-05-01: `P5-T43` is split across local unsubscribe contract, email header/footer, and lead-owned docs/validation lanes while `P5-T6` remains review-only scope control.
  Lead: Codex
  Backend lanes: `unsubscribe-contract`, `email-unsubscribe-headers`
  Other lanes: `lead-docs-validation`
  Integration owner: Codex
- Lane: `unsubscribe-contract`
  Goal: add signed stateless local campaign recipient unsubscribe tokens, unauthenticated `/api/v2/public/communications/unsubscribe/:token` GET/POST behavior, generic no-leak responses, and local-email suppression evidence recording.
  Owned paths: `backend/src/modules/communications/**`, `backend/src/modules/contacts/services/contactSuppressionService.ts`, `backend/src/types/contact.ts`, focused communications and contact suppression backend tests
  Forbidden shared paths: Mailchimp adapter rewrites, database migrations/initdb/manifest, frontend UI, docs except lead integration
  Expected tests: focused communications service/route tests, contact suppression tests, route validation policy, v2 ownership policy, and `cd backend && npm run type-check`
  Handoff notes: confirm invalid/repeated tokens do not leak contact existence and valid tokens sync `contacts.do_not_email`.
  Docs ownership: lead
  Disposition: `In review; proof refreshed in P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md with API-only origin, registrar, and token-hardening coverage`
- Lane: `email-unsubscribe-headers`
  Goal: add per-recipient unsubscribe footer links and SMTP `List-Unsubscribe` / `List-Unsubscribe-Post` headers for local campaign sends.
  Owned paths: `backend/src/modules/communications/services/communicationsService.ts`, `backend/src/services/emailService.ts`, `backend/src/__tests__/services/emailService.test.ts`, focused communications send tests
  Forbidden shared paths: public unsubscribe route/controller, contact suppression service, Mailchimp adapter rewrites, database files, frontend UI, docs/proof files
  Expected tests: focused local campaign send test, email service header pass-through test, and `cd backend && npm run type-check`
  Handoff notes: summarize API-only URL base selection, Docker dev `API_ORIGIN`, and footer/header behavior.
  Docs ownership: lead
  Disposition: `In review; proof refreshed in P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md with Docker dev API-origin proof`
- Lane: `lead-docs-validation`
  Goal: keep the workboard current, add `P5-T43` proof, record pass/fail validation honestly, and move the row to `Review` after implementation proof.
  Owned paths: `docs/phases/planning-and-progress.md`, `docs/validation/**`, docs indexes as needed
  Forbidden shared paths: runtime code except integration conflict resolution after worker handoff
  Expected tests: focused worker-reported tests, backend type-check, route/v2 policy checks, `make db-verify`, docs checks, and `git diff --check`
  Docs ownership: lead
  Disposition: `In review; Docker-dependent validation blocked by unavailable local Docker socket`
- Coordinated exception, 2026-05-01: `P5-T40` is split across backend alert scope, alerts/notifications UI, portal UI, admin/settings UI, staff-page UI, and lead-owned docs/validation while cases and people/contact/account implementation surfaces stay out of scope.
  Lead: Codex
  Backend lane: `alerts-scope-contract`
  Frontend lanes: `alerts-notifications-ui`, `portal-client-ui`, `admin-settings-ui`, `staff-page-ui`
  Other lanes: `lead-docs-validation`
  Integration owner: Codex
- Lane: `alerts-scope-contract`
  Goal: scope alert instance list, acknowledge, and resolve operations to alert rules owned by the current user before personal queue copy is used.
  Owned paths: `backend/src/modules/alerts/**`, focused backend alert tests
  Forbidden shared paths: portal UI, admin/settings UI, staff-page UI, docs except lead integration
  Expected tests: focused alerts usecase/repository or integration tests plus backend type-check if practical
  Docs ownership: lead
- Lane: `alerts-notifications-ui`
  Goal: standardize alert terminology, add clear action/status iconography, subtle feedback animation, pending/error feedback, and channel setup copy.
  Owned paths: `frontend/src/features/alerts/**`, `frontend/src/routes/routeCatalog/staffInsightsRoutes.ts`, focused alert UI tests
  Forbidden shared paths: backend alert code, portal UI, admin/settings UI, broad staff pages, docs
  Expected tests: focused alert page/slice tests plus route UX smoke if labels change
  Docs ownership: lead
- Lane: `portal-client-ui`
  Goal: simplify portal copy, add client-appropriate iconography and subtle transitions, improve empty-state timing, and preserve all client functionality.
  Owned paths: `frontend/src/features/portal/pages/**` except portal case/people/public-case-form pages, `frontend/src/components/portal/**`, portal route catalog only if needed
  Forbidden shared paths: `frontend/src/features/cases/**`, `frontend/src/features/people/**`, contact/account implementation pages, alerts/admin/staff lanes, docs
  Expected tests: focused portal page/list/access tests plus route UX smoke if labels change
  Docs ownership: lead
- Lane: `admin-settings-ui`
  Goal: clarify Admin Hub/Admin Tools/Communications/Email Delivery/Mailchimp vocabulary, improve API/Webhooks dialog accessibility, notification preference labels, and status iconography.
  Owned paths: `frontend/src/features/adminOps/**`, `frontend/src/features/webhooks/**`, `frontend/src/features/navigation/**`, `frontend/src/features/workspaceModules/**`
  Forbidden shared paths: cases, people/contact/account implementation pages, alerts/portal/staff lanes, docs
  Expected tests: focused admin/webhooks/nav tests plus frontend type-check if practical
  Docs ownership: lead
- Lane: `staff-page-ui`
  Goal: remove internal copy and add meaningful icons, subtle motion, clearer status signals, and low-risk progressive disclosure across eligible staff pages.
  Owned paths: `frontend/src/features/reports/**`, `frontend/src/features/grants/**`, `frontend/src/features/websites/**`, `frontend/src/features/finance/**`, `frontend/src/features/analytics/**`, `frontend/src/features/tasks/**`, `frontend/src/features/volunteers/**`, `frontend/src/features/meetings/**`, `frontend/src/features/teamChat/**`
  Forbidden shared paths: cases, people/contact/account implementation pages, alerts/portal/admin lanes, docs
  Expected tests: focused page tests for touched surfaces plus frontend type-check if practical
  Docs ownership: lead
- Lane: `lead-docs-validation`
  Goal: keep the workboard/audit note current, integrate non-overlapping changes, run final focused validation, and record blockers honestly.
  Owned paths: `docs/phases/planning-and-progress.md`, `docs/validation/**`, final validation notes
  Forbidden shared paths: worker-owned runtime code except integration conflict resolution after handoff
  Expected tests: focused worker-reported tests, backend/frontend type-checks where practical, route/catalog smoke checks, and `git diff --check`
  Docs ownership: lead
- Coordinated exception, 2026-05-01: `P5-T37`, `P5-T38`, and `P5-T39` are split across communications, case-form evidence, and frontend health lanes while the live workboard, shared migration ordering, `database/migrations/manifest.tsv`, `database/initdb/000_init.sql`, docs/proof notes, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: `communications-queue-controls`, `case-form-evidence-events`
  Frontend lanes: `communications-run-drilldown`, `audit-report-health-ui`
  Other lanes: `lead-migrations-docs-validation`
  Integration owner: Codex
- Lane: `communications-queue-controls`
  Goal: make local campaign-run sending reentrant for `draft`, `scheduled`, and `sending`; add recipient drilldown data; add local-only cancel/reschedule; preserve Mailchimp unsupported-provider behavior.
  Owned paths: `backend/src/modules/communications/**`, `backend/src/types/communications.ts`, focused communications backend tests, `frontend/src/features/mailchimp/**`, `frontend/src/types/mailchimp.ts`, focused communications frontend tests
  Forbidden shared paths: database manifest/initdb, case-form code, audit/scheduled-report UI, docs/proof files
  Expected tests: focused communications service tests, route validation policy, v2 ownership policy, `cd backend && npm run type-check`, focused `EmailMarketingPage` tests, and `cd frontend && npm run type-check`
  Handoff notes: summarize local recipient status behavior, cancel/reschedule limits, Mailchimp compatibility, and deferred consent/automation scope.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md`
- Lane: `case-form-evidence-events`
  Goal: add append-only staff-only case-form assignment evidence events for submissions, revision requests, reviewed, closed, and cancelled decisions.
  Owned paths: `backend/src/modules/cases/repositories/caseFormsRepository*.ts`, `backend/src/modules/cases/usecases/caseForms.usecase*.ts`, case-form backend tests, `backend/src/types/caseForms.ts`, `frontend/src/types/caseForms.ts`, `frontend/src/features/cases/caseForms/**`, focused case-form frontend tests
  Forbidden shared paths: database manifest/initdb, communications code, audit/scheduled-report UI, docs/proof files
  Expected tests: focused case-form backend repository/usecase tests, `cd backend && npm run type-check`, focused case-form frontend tests, and `cd frontend && npm run type-check`
  Handoff notes: confirm idempotent submission replay does not duplicate events, evidence stays staff-only, metadata avoids answer/file payloads, and portal/public responses do not expose evidence events.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md`
- Lane: `audit-report-health-ui`
  Goal: add scheduled-report health summaries and audit-log health context from existing data without scheduler, retention, backend, schema, API, or reporting-domain changes.
  Owned paths: `frontend/src/features/scheduledReports/**`, `frontend/src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.tsx`, focused scheduled-report and audit-log frontend tests
  Forbidden shared paths: backend code, database files, communications code, case-form code, docs/proof files
  Expected tests: focused scheduled-report page tests, direct audit-log section test, and `cd frontend && npm run type-check`
  Handoff notes: summarize failed/stale/due schedule rules, read-only behavior, audit warning/empty/error states, and rejected finance/governance scope.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md`
- Lane: `lead-migrations-docs-validation`
  Goal: assign and reconcile migration numbers, update manifest/initdb for schema lanes, add proof notes, keep reference consolidation docs linked, and run final validation.
  Owned paths: `database/migrations/112_local_campaign_run_controls.sql`, `database/migrations/113_case_form_assignment_events.sql`, `database/migrations/manifest.tsv`, `database/initdb/000_init.sql`, `docs/phases/planning-and-progress.md`, `docs/validation/**`, docs indexes as needed
  Forbidden shared paths: worker-owned runtime code except integration conflict resolution after handoff
  Expected tests: `make db-verify`, docs checks, policy checks, focused worker-reported tests, backend/frontend type-checks, and `git diff --check`
  Handoff notes: record pass/fail commands and keep `P5-T6` in review as the scope-control gate.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_REFERENCE_IMPROVEMENTS_CLOSEOUT_2026-05-01.md`
- Coordinated exception, 2026-05-01: `P5-T36` is split across backend/database, frontend, Mailchimp compatibility, and lead-owned docs/validation lanes while shared workboard, route registration, migration ordering, API shape, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: `local-communications-api`, `local-delivery-queue`
  Frontend lanes: `communications-local-first-ui`
  Other lanes: `mailchimp-secondary-provider`, `docs-validation-closeout`
  Integration owner: Codex
- Lane: `local-communications-api`
  Goal: add provider-neutral `/api/v2/communications/*` status, audience, preview, campaign, test-send, run-list, and run-send APIs backed by local campaign records and existing email rendering.
  Owned paths: `backend/src/modules/communications/**`, `backend/src/types/communications.ts`, focused communications API tests
  Forbidden shared paths: Mailchimp adapter internals except typed compatibility imports, contact suppression schema, frontend code, `docs/phases/planning-and-progress.md`
  Expected tests: focused communications backend tests, route validation policy, module ownership policy, and `cd backend && npm run type-check`
  Handoff notes: summarize route contracts, response envelopes, local default provider behavior, and compatibility boundaries.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md`
- Lane: `local-delivery-queue`
  Goal: add migration-backed local campaign recipient delivery rows, queued SMTP batch sending, local audience/suppression resolution, and newsletter signup local-provider defaults.
  Owned paths: `database/migrations/111_local_first_communications.sql`, `database/migrations/manifest.tsv`, `database/initdb/000_init.sql`, `backend/src/modules/communications/**`, `backend/src/services/newsletterProviderService.ts`, `backend/src/services/publishing/publicWebsiteFormService.ts`, focused delivery/newsletter tests
  Forbidden shared paths: frontend code, Mailchimp UI, docs closeout files
  Expected tests: `make db-verify`, focused backend communications/newsletter tests, and `cd backend && npm run type-check`
  Handoff notes: summarize recipient statuses, SMTP batching limits, suppression handling, and public signup provider result shape.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md`
- Lane: `communications-local-first-ui`
  Goal: make `/settings/communications` usable without Mailchimp, default campaign creation to Local Email, show SMTP readiness first, and expose Mailchimp only as an explicit secondary provider.
  Owned paths: `frontend/src/features/mailchimp/**`, `frontend/src/types/mailchimp.ts`, focused communications tests
  Forbidden shared paths: backend code, migrations, route catalogs unless required for existing route labels, `docs/phases/planning-and-progress.md`
  Expected tests: focused `EmailMarketingPage` tests, route catalog drift if route labels change, and `cd frontend && npm run type-check`
  Handoff notes: summarize visible workflow changes, unconfigured-Mailchimp behavior, and unsupported states.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md`
- Lane: `mailchimp-secondary-provider`
  Goal: preserve existing `/api/v2/mailchimp/*` behavior while routing new default communications workflow through local provider contracts and keeping Mailchimp selected only when explicit.
  Owned paths: `backend/src/modules/mailchimp/**`, `backend/src/types/mailchimp.ts`, focused Mailchimp compatibility tests
  Forbidden shared paths: local recipient-delivery migration, frontend code, docs closeout files
  Expected tests: focused Mailchimp service and route-security tests plus `cd backend && npm run type-check`
  Handoff notes: confirm Mailchimp routes remain adapter-specific and no automatic mirroring was added.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md`
- Lane: `docs-validation-closeout`
  Goal: update API/testing/docs references, add proof notes, and reconcile this workboard after implementation validation.
  Owned paths: `docs/api/**`, `docs/testing/**`, `docs/validation/**`, `docs/phases/planning-and-progress.md`, archive indexes as needed
  Forbidden shared paths: runtime code, migrations
  Expected tests: `make check-links`, `make lint-doc-api-versioning`, focused backend/frontend/db checks reported by implementation lanes
  Handoff notes: record pass/fail commands and scope boundaries for `P5-T36`, including Mailchimp optional-provider behavior.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md`
- Coordinated exception, 2026-05-01: `P5-T33` and `P5-T34` are split across backend/integration, database/contact-policy, frontend, and lead-owned docs/validation lanes while shared workboard, migration ordering, API scope, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: `campaign-reporting-metrics`, `suppression-webhook-evidence`
  Frontend lanes: `campaign-metrics-ui`, `contact-suppression-ui`
  Other lanes: `suppression-governance-schema`, `docs-validation-closeout`
  Integration owner: Codex
- Lane: `campaign-reporting-metrics`
  Goal: hydrate local campaign-run records with provider summary metrics while preserving the existing Mailchimp campaign-run contract.
  Owned paths: `backend/src/modules/mailchimp/**`, `backend/src/types/mailchimp.ts`, focused Mailchimp tests
  Forbidden shared paths: migrations, contact suppression API, frontend code, `docs/phases/planning-and-progress.md`
  Expected tests: focused Mailchimp service and route-security tests plus `cd backend && npm run type-check`
  Handoff notes: summarize normalized provider metrics and confirm no typed appeal/ROI implementation was added.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md`
- Lane: `suppression-governance-schema`
  Goal: add migration-backed channel/reason DNC evidence and fatigue policy tables plus contact-module service/API coverage.
  Owned paths: `database/migrations/110_communication_suppression_governance.sql`, `database/migrations/manifest.tsv`, `database/initdb/000_init.sql`, `backend/src/modules/contacts/**`, `backend/src/types/contact.ts`, `backend/src/validations/contact.ts`, focused contact suppression tests
  Forbidden shared paths: Mailchimp campaign-run metrics UI, newsletter provider code, broad delivery automation, `docs/phases/planning-and-progress.md`
  Expected tests: `make db-verify`, focused contact suppression backend tests, and `cd backend && npm run type-check`
  Handoff notes: summarize table contract, reason/source taxonomy, and fatigue-policy limits.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md`
- Lane: `suppression-webhook-evidence`
  Goal: have Mailchimp unsubscribe/cleaned webhook back-sync write contact suppression evidence while preserving `contacts.do_not_email`.
  Owned paths: `backend/src/modules/mailchimp/**`, focused Mailchimp tests
  Forbidden shared paths: contact route registration outside the API needed by the schema lane, migrations, frontend code, `docs/phases/planning-and-progress.md`
  Expected tests: focused Mailchimp webhook tests plus `cd backend && npm run type-check`
  Handoff notes: summarize provider evidence created and compatibility behavior preserved.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md`
- Lane: `campaign-metrics-ui`
  Goal: show campaign-run provider metrics in the communications workspace with provider-summary wording.
  Owned paths: `frontend/src/features/mailchimp/**`, `frontend/src/types/mailchimp.ts`, focused communications tests
  Forbidden shared paths: backend code, migrations, contact suppression UI, `docs/phases/planning-and-progress.md`
  Expected tests: focused `EmailMarketingPage` tests plus `cd frontend && npm run type-check`
  Handoff notes: summarize visible metrics and no appeal/ROI parity claims.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md`
- Lane: `contact-suppression-ui`
  Goal: show and manage contact suppression ledger entries near existing contact communications and donor preference surfaces.
  Owned paths: `frontend/src/features/contacts/**`, `frontend/src/types/contact.ts`, focused contact UI tests
  Forbidden shared paths: Mailchimp campaign UI, backend code, migrations, route catalogs unless strictly required, `docs/phases/planning-and-progress.md`
  Expected tests: focused contact suppression UI tests plus `cd frontend && npm run type-check`
  Handoff notes: summarize staff workflow and unsupported automation/fatigue behavior.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md`
- Lane: `docs-validation-closeout`
  Goal: add proof notes and reconcile the live board after implementation validation.
  Owned paths: `docs/validation/**`, `docs/phases/planning-and-progress.md`, docs indexes if needed
  Forbidden shared paths: runtime code, migrations
  Expected tests: `make check-links`, focused backend/frontend/db checks reported by implementation lanes
  Handoff notes: record pass/fail commands and scope boundaries for `P5-T33`, `P5-T34`, and `P5-T6`.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_CAMPAIGN_REPORTING_SUPPRESSION_CLOSEOUT_2026-05-01.md`
- Coordinated exception, 2026-05-01: `P5-T26` through `P5-T32` are split across reference/docs, backend, frontend, and docs/verification lanes while shared workboard, reference manifest, route contracts, migration ordering, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: `email-campaign-operability`
  Frontend lanes: `communications-ui-operability`
  Other lanes: `newsletter-reference-docs`, `email-docs-verification`
  Integration owner: Codex
- Lane: `newsletter-reference-docs`
  Goal: refresh newsletter-specific reference repos and docs without copying GPL/AGPL source into the product.
  Owned paths: `reference-repos/manifest.lock.json`, `docs/development/reference-patterns/**`
  Forbidden shared paths: runtime code, migrations, `docs/phases/planning-and-progress.md`
  Expected tests: `make check-links`
  Handoff notes: summarize pinned commits, licenses, reuse classes, and any direct-copy prohibition.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md`
- Lane: `email-campaign-operability`
  Goal: implement backend support for real campaign test-send, scope-aware campaign-run actions, Mailchimp webhook back-sync, and website newsletter provider wiring.
  Owned paths: `backend/src/modules/mailchimp/**`, `backend/src/services/newsletterProviderService.ts`, `backend/src/services/mauticService.ts`, `backend/src/services/publishing/**`, focused backend tests
  Forbidden shared paths: frontend code, shared auth/permission helpers unless strictly required, `docs/phases/planning-and-progress.md`
  Expected tests: focused Mailchimp, newsletter-provider, and public-website signup tests plus `cd backend && npm run type-check`
  Handoff notes: summarize API contracts, webhook contact updates, run-action scope checks, and any provider limitation.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md`
- Lane: `communications-ui-operability`
  Goal: implement the staff-facing searchable audience selector, campaign preflight/test-send UI, campaign-run action affordances, discoverability label polish, and tag/segment reachability.
  Owned paths: `frontend/src/features/mailchimp/**`, `frontend/src/types/mailchimp.ts`, focused communications-route tests
  Forbidden shared paths: backend code, migrations, `docs/phases/planning-and-progress.md`
  Expected tests: focused `EmailMarketingPage`/route tests plus `cd frontend && npm run type-check`
  Handoff notes: summarize changed staff workflow, unsupported states, and any API dependency.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md`
- Lane: `email-docs-verification`
  Goal: refresh Mailchimp/API docs to current route contracts and run focused verification after implementation lanes land.
  Owned paths: `docs/api/**`, `docs/testing/**`, validation notes as needed
  Forbidden shared paths: runtime code, migrations, `docs/phases/planning-and-progress.md`
  Expected tests: `make check-links`, `make lint-doc-api-versioning`, focused backend/frontend checks reported by implementation lanes
  Handoff notes: summarize docs changed and final pass/fail validation evidence.
  Docs ownership: lead
  Disposition: `Signed off; archived in P5_NEWSLETTER_EMAIL_OPERABILITY_CLOSEOUT_2026-05-01.md`
- Coordinated exception, 2026-04-30: `P5-T23` is split across read-only discovery lanes plus lead-owned implementation while shared workboard and validation seams stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-unused-file-prune`
  Frontend lanes: `frontend-unused-type-prune`
  Other lanes: `repo-health-validation`
  Integration owner: Codex
- Lane: `backend-unused-file-prune`
  Goal: remove only current `knip`-reported unused backend files after import tracing confirms no live references.
  Owned paths: `backend/src/modules/cases/queries/closureQueries.ts`, `backend/src/modules/cases/routes/caseRouteSchemas.ts`, `backend/src/modules/mailchimp/services/mailchimpCampaignAudienceHelpers.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, auth/permission helpers, migrations, staged publishing/runtime files, `docs/phases/planning-and-progress.md`
  Expected tests: targeted import grep, `npm run knip`, backend type-check, module-boundary policy, canonical-import policy
  Handoff notes: summarize deleted files, preserved route/service behavior, and any retained broader backend candidates
  Docs ownership: lead
  Disposition: Archived in [archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md](archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md)
- Lane: `frontend-unused-type-prune`
  Goal: remove only current `knip`-reported unused frontend type files after confirming the canonical exports remain in use.
  Owned paths: `frontend/src/types/casePortalTypes.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/store/**`, shared API clients, staged builder/websites files, `docs/phases/planning-and-progress.md`
  Expected tests: targeted import grep, `npm run knip`, frontend type-check, frontend feature-boundary policy
  Handoff notes: summarize deleted type surface and canonical replacement path
  Docs ownership: lead
  Disposition: Archived in [archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md](archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md)
- Lane: `repo-health-validation`
  Goal: rerun the repo-health proof that selected the cleanup and report any unrelated staged-work caveats without widening the code scope.
  Owned paths: none; report findings to the lead instead of editing directly
  Forbidden shared paths: runtime code and docs
  Expected tests: `node scripts/check-implementation-size-policy.ts`, deleted-path guards as needed, `make check-links`, `git diff --check`, and the smallest package type-checks for touched surfaces
  Handoff notes: report pass/fail commands and any caveats such as unrelated UI-audit baseline drift
  Docs ownership: lead
  Disposition: Archived in [archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md](archive/P5_REVIEW_QUEUE_CLOSEOUT_2026-04-30.md)
- Coordinated exception, 2026-04-26: `P5-T11` is split across implementation and evidence lanes while shared route/store/catalog/workboard/runtime seams stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-shim-prune`, `cases-route-decomposition`
  Frontend lanes: `builder-wrapper-cleanup`, `frontend-monolith-split`
  Other lanes: `docs-handoff`, `pruning-validation`
  Integration owner: Codex
- Lane: `backend-shim-prune`
  Goal: remove only confirmed-unused root backend service shims after current `rg` and `knip` evidence, without changing module implementations or runtime behavior.
  Removed root shim paths: `backend/src/services/reportService.ts`, `backend/src/services/reportTemplateService.ts`, `backend/src/services/savedReportService.ts`, `backend/src/services/scheduledReportService.ts`, `backend/src/services/socialMediaSyncSchedulerService.ts`, `backend/src/services/webhookRetrySchedulerService.ts`, `backend/src/services/webhookService.ts`, `backend/src/services/webhookTransport.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `backend/src/worker.ts`, auth/permission helpers, `docs/phases/planning-and-progress.md`
  Expected tests: final import grep, `npm run knip`, backend type-check, and module-boundary/canonical-import policy checks
  Handoff notes: summarize deleted shims, grep evidence, and any retained compatibility shims
  Docs ownership: lead
  Disposition: `Review`
- Lane: `cases-route-decomposition`
  Goal: split the cases route registrar into module-local schema and subroute helpers while preserving route order, validation, permissions, and `/api/v2/cases/*` behavior.
  Owned paths: `backend/src/modules/cases/routes/**`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, migrations, auth/permission helpers, `docs/phases/planning-and-progress.md`
  Expected tests: route-validation policy, focused cases/follow-ups integration tests, and backend type-check
  Handoff notes: summarize route groups moved and route-order safeguards
  Docs ownership: lead
  Disposition: `Review`
- Lane: `builder-wrapper-cleanup`
  Goal: move remaining global builder/editor wrapper tests to feature-owned builder imports, then delete unused global wrappers only when current import evidence proves they are dead.
  Removed wrapper paths: `frontend/src/components/editor/**`, `frontend/src/components/templates/**`; coverage moved to feature-owned builder tests.
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/store/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted builder/editor Vitest, `npm run knip`, frontend type-check, and frontend deleted-path guards
  Handoff notes: summarize removed wrappers, retained test coverage, and hidden-import checks
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-monolith-split`
  Goal: complete one feature-owned frontend split, favoring Mailchimp page/controller or portal case-detail inner extraction, without changing routes, API clients, or browser-visible behavior.
  Owned paths: `frontend/src/features/mailchimp/**` or `frontend/src/features/portal/**` as selected by the integrator
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/store/index.ts`, shared API clients, `docs/phases/planning-and-progress.md`
  Expected tests: targeted feature Vitest plus frontend type-check
  Handoff notes: summarize extracted hooks/components and behavior-preservation proof
  Docs ownership: lead
  Disposition: `Review`
- Lane: `docs-handoff`
  Goal: publish the refactor plan and final handoff under `docs/refactoring/` and link the new section from the docs catalog and workboard.
  Owned paths: `docs/refactoring/**`, `docs/README.md`, `docs/phases/planning-and-progress.md`, `docs/phases/PHASE_5_DEVELOPMENT_PLAN.md`
  Forbidden shared paths: runtime code
  Expected tests: `make check-links`, plus API-version docs lint only if versioned API wording changes
  Handoff notes: record completed refactors, validation, skipped checks, and next candidates
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-20: `P5-T4` is split across parallel lanes.
  Lead: Codex
  Backend lanes: `backend-publishing-runtime`
  Frontend lanes: `frontend-websites-console`, `frontend-builder`
  Other lanes: `docs-e2e`
  Integration owner: Codex
- Lane: `backend-publishing-runtime`
  Goal: make one managed public form consistent across publishing metadata, public runtime verification, and staff-facing form details without changing route shapes
  Owned paths: `backend/src/modules/publishing/**`, `backend/src/services/publishing/**`, `backend/src/public-site.ts`, `backend/src/types/publishing.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted publishing service and integration coverage for form metadata and public submission/runtime
  Handoff notes: summarize contract additions, cache/runtime assumptions, and any follow-up needed in frontend or docs
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-websites-console`
  Goal: expose one-form verification, publish-state, and public-surface actions in the website console
  Owned paths: `frontend/src/features/websites/**`, `frontend/src/types/websiteBuilder.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted website overview/forms/publishing page coverage
  Handoff notes: summarize UI contract changes and any builder/doc dependencies
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-builder`
  Goal: keep the site-aware builder aware of managed-form publish state and point editors back to the console follow-through
  Owned paths: `frontend/src/features/builder/**`, `frontend/src/features/builder/components/editor/**`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted page-editor controller coverage
  Handoff notes: summarize site-context changes and any overlap requiring lead integration
  Docs ownership: lead
  Disposition: `Review`
- Lane: `docs-e2e`
  Goal: align the website/public-runtime docs and targeted browser proof with the one-form managed publish loop
  Owned paths: `docs/features/TEMPLATE_SYSTEM.md`, `docs/features/FEATURE_MATRIX.md`, `docs/deployment/publishing-deployment.md`, `docs/testing/TESTING.md`, `e2e/tests/public-website.spec.ts`, `e2e/tests/publishing.spec.ts`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: targeted Playwright publishing/public-site coverage plus `make check-links` when docs change
  Handoff notes: summarize doc/runtime wording changes and exact browser proof added
  Docs ownership: lane
  Disposition: `Review`
- Coordinated exception, 2026-04-22: `P5-T2B` includes a `security-hardening` sub-lane while shared validation, route, and workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `security-hardening`
  Frontend lanes: none
  Other lanes: none
  Integration owner: Codex
- Coordinated exception, 2026-04-24: `P5-T2B` included an `e2e-webkit-import-recovery` sub-lane while the final Docker CI rerun and workboard promotion stayed lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: none
  Other lanes: `e2e-webkit-import-recovery`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T5` is split across parallel lanes while shared route/workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `portal-forms-contract`
  Frontend lanes: `portal-forms-inbox`
  Other lanes: `portal-docs-e2e`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T3` and `P5-T6` were split across parallel lanes while shared route/workboard seams stayed lead-owned; no lane from this exception is currently signed out as in progress.
  Lead: Codex
  Backend lanes: `backend-mailchimp-campaigns`, `backend-email-renderer`
  Frontend lanes: `frontend-communications-workspace`, `frontend-email-builder`
  Other lanes: `docs-email-wave`, `fundraising-ops-brief`, `portal-ops-brief`, `volunteer-dispatch-brief`, `finance-membership-brief`, `workflow-program-ops-brief`
  Integration owner: Codex
- Coordinated exception, 2026-04-22: `P5-T6` shifts from repo-review lanes into capability-based adoption briefs while shared workboard and synthesis docs stay lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: none
  Other lanes: `fundraising-ops-brief`, `portal-ops-brief`, `volunteer-dispatch-brief`, `finance-membership-brief`, `workflow-program-ops-brief`
  Integration owner: Codex
- Coordinated exception, 2026-04-24: `P5-T6D` is split into a lead-owned workboard/docs lane plus one frontend runtime lane.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: `dispatch-radar`
  Other lanes: none
  Integration owner: Codex
- Coordinated exception, 2026-04-25: `P5-T6C1` is split into backend and frontend runtime lanes while shared workboard/docs and final verification stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-reassessment-cycle`
  Frontend lanes: `frontend-reassessment-panel`
  Other lanes: none
  Integration owner: Codex
- Lane: `backend-reassessment-cycle`
  Goal: add explicit case reassessment-cycle records linked to one-time case follow-ups, with list/create/update/complete/cancel case endpoints and focused backend proof
  Owned paths: `database/migrations/108_case_reassessment_cycles.sql`, `database/migrations/manifest.tsv`, `backend/src/modules/cases/**`, `backend/src/types/case.ts`, `backend/src/__tests__/integration/cases.test.ts`, `backend/src/__tests__/integration/followUps.test.ts`
  Forbidden shared paths: `frontend/src/**`, `docs/phases/planning-and-progress.md`, `backend/src/routes/v2/index.ts`
  Expected tests: `cd backend && npm test -- --runInBand src/__tests__/integration/followUps.test.ts src/__tests__/integration/cases.test.ts`, `cd backend && npm run type-check`, and `make db-verify` when the migration/manifest changes
  Handoff notes: summarize reassessment status transitions, linked follow-up behavior, outcome requirements, and next-cycle creation boundaries
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-reassessment-panel`
  Goal: expose the case reassessment cadence inside the existing case detail Follow-ups tab above the generic follow-up list, without adding routes or portal surfaces
  Owned paths: `frontend/src/features/cases/**`, `frontend/src/types/case.ts`, `frontend/src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx`
  Forbidden shared paths: `backend/src/**`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: `cd frontend && npm test -- --run src/features/cases/pages/__tests__/CaseDetailTabs.test.tsx src/features/followUps/pages/__tests__/FollowUpsPage.test.tsx` plus `cd frontend && npm run type-check`
  Handoff notes: summarize visible cadence states, form behavior, linked follow-up assumptions, and any backend contract dependency
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-25: `P5-T7` is split across backend and frontend modularization lanes while shared route/store/catalog/workboard/runtime seams stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-social-media-boundary`, `backend-webhooks-boundary`, `backend-reports-family-boundary`
  Frontend lanes: `frontend-publishing-builder-boundary`, `frontend-insights-finance-boundary`
  Other lanes: `lead-integration`
  Integration owner: Codex
- Lane: `backend-social-media-boundary`
  Goal: finish social-media domain isolation, including scheduler-adjacent service cleanup, without changing route behavior
  Owned paths: `backend/src/modules/socialMedia/**`, `backend/src/modules/socialMedia/services/socialMediaSyncSchedulerService.ts`, social-media backend tests
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `backend/src/worker.ts`, auth/policy helpers, `docs/phases/planning-and-progress.md`
  Expected tests: social-media module tests, social-media integration test, and `cd backend && npm run type-check`
  Handoff notes: summarize scheduler assumptions, import changes, and any lead-owned worker follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `backend-webhooks-boundary`
  Goal: move webhook and API-key behavior behind module-owned services while leaving worker startup and compatibility exports lead-owned
  Owned paths: `backend/src/modules/webhooks/**`, webhook/API-key service tests
  Forbidden shared paths: `backend/src/worker.ts`, `backend/src/routes/v2/index.ts`, root compatibility exports unless lead-approved, `docs/phases/planning-and-progress.md`
  Expected tests: webhook integration/service tests, API-key service tests, module-boundary policy check, and `cd backend && npm run type-check`
  Handoff notes: summarize retry/runtime behavior, compatibility exports still needed, and any worker follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `backend-reports-family-boundary`
  Goal: consolidate reports, saved reports, and scheduled reports around module-owned services/usecases while preserving scheduler and public-report behavior
  Owned paths: `backend/src/modules/reports/**`, `backend/src/modules/savedReports/**`, `backend/src/modules/scheduledReports/**`, related report tests
  Forbidden shared paths: `backend/src/worker.ts`, `backend/src/routes/v2/index.ts`, public report snapshot services unless lead-approved, `docs/phases/planning-and-progress.md`
  Expected tests: report, saved-report, and scheduled-report focused tests plus `cd backend && npm run type-check`
  Handoff notes: summarize scheduler/public-report assumptions and any compatibility shims still required
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-publishing-builder-boundary`
  Goal: reduce global editor/template leakage by moving publishing-owned UI logic toward websites/builder feature ownership
  Owned paths: `frontend/src/features/websites/**`, `frontend/src/features/builder/**`, `frontend/src/features/builder/components/editor/**`, `frontend/src/features/builder/components/templates/**`, `frontend/src/types/websiteBuilder.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/routes/routeCatalog/**`, shared API clients, `docs/phases/planning-and-progress.md`
  Expected tests: websites, builder, and editor Vitest suites plus `cd frontend && npm run type-check`
  Handoff notes: summarize moved ownership, preview/editor behavior covered, and any route/catalog follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-insights-finance-boundary`
  Goal: split large analytics, reports, finance, grants, dashboard, outcomes, and alerts surfaces into feature-local controllers/hooks/components
  Owned paths: `frontend/src/features/reports/**`, `frontend/src/features/savedReports/**`, `frontend/src/features/scheduledReports/**`, `frontend/src/features/analytics/**`, `frontend/src/features/dashboard/**`, `frontend/src/features/finance/**`, `frontend/src/features/grants/**`, `frontend/src/features/outcomes/**`, `frontend/src/features/alerts/**`
  Forbidden shared paths: `frontend/src/routes/**`, `frontend/src/routes/routeCatalog/**`, `frontend/src/store/index.ts`, shared navigation, `docs/phases/planning-and-progress.md`
  Expected tests: focused feature Vitest suites plus `cd frontend && npm run type-check`
  Handoff notes: summarize extracted controllers/hooks/components, route/store assumptions, and any lead-owned integration follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `lead-integration`
  Goal: own workboard, route/store/catalog seams, compatibility-shim removal order, and final validation
  Owned paths: `docs/phases/planning-and-progress.md`, `backend/src/routes/v2/index.ts`, `backend/src/index.ts`, `backend/src/worker.ts`, `frontend/src/routes/**`, `frontend/src/routes/routeCatalog/**`, `frontend/src/store/index.ts`, shared auth/permission helpers, shared frontend API clients
  Forbidden shared paths: lane-owned module and feature paths unless integrating returned work
  Expected tests: route/catalog tests, root lint/typecheck/test pass, and selected E2E proof only if route or browser behavior changed
  Handoff notes: record compatibility-shim disposition, skipped broad proof rationale, and final validation commands
  Docs ownership: lead
  Disposition: `Review`
- Lane: `dispatch-radar`
  Goal: replace raw volunteer assignment event/task UUID entry with searchable active event/task pickers while preserving the existing assignment contract
  Owned paths: `frontend/src/components/AssignmentForm.tsx`, `frontend/src/components/__tests__/AssignmentForm.test.tsx`, `frontend/src/features/volunteers/pages/VolunteerDetailPage.tsx`, `frontend/src/features/volunteers/api/volunteersApiClient.ts`, `frontend/src/features/tasks/api/tasksApiClient.ts`, `frontend/src/features/events/api/eventsApiClient.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: `cd frontend && npm test -- --run src/components/__tests__/AssignmentForm.test.tsx` plus frontend type-check after integration
  Handoff notes: summarize picker data sources, assignment payload compatibility, and any proven backend read-contract gap
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-22: `P5-T2C` proof from the focused remediation lanes is landed and now sits in review while shared route/workboard seams stay lead-owned.
  Lead: Codex
  Backend lanes: `scheduled-reports-proof`, `report-template-proof`
  Frontend lanes: `frontend-builder-remediation`
  Other lanes: none
  Integration owner: Codex
- Lane: `security-hardening`
  Goal: clear the current security-scan red state and make auth and security monitoring operational without changing shared route or workboard contracts
  Owned paths: `docs/security/**`, `docs/validation/**`, `scripts/security-scan.sh`, `scripts/check-auth-guard-policy.ts`, `scripts/check-rate-limit-key-policy.ts`, `backend/package.json`, `backend/package-lock.json`, `backend/src/modules/auth/**`, `backend/src/middleware/apiKeyAuth.ts`, `backend/src/middleware/portalAuth.ts`, `backend/src/services/authGuardService.ts`, `backend/src/services/piiService.ts`, `backend/src/__tests__/modules/auth/**`, `backend/src/__tests__/modules/*.security.test.ts`, `backend/src/__tests__/services/paymentProviderService.ssrf.test.ts`, `backend/src/__tests__/services/webhookService.secretExposure.test.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: `make security-scan`, `node scripts/check-auth-guard-policy.ts`, `node scripts/check-rate-limit-key-policy.ts`, plus the narrowest auth, portal, payments, reconciliation, SSRF, or webhook suites touched by the lane
  Handoff notes: summarize dependency-scan status, operational dashboard or policy changes, and any follow-up the queued email or portal review lanes must carry
  Docs ownership: lane
  Disposition: `Review`
- Lane: `e2e-webkit-import-recovery`
  Goal: recover from the WebKit-only lazy-module import console burst without weakening route-health, launch, or audit checks for real route/runtime failures
  Owned paths: `e2e/helpers/**`, `e2e/tests/setup-launch.spec.ts`, `e2e/tests/link-health.spec.ts`, `e2e/tests/visibility-link-audit.spec.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: focused WebKit reruns for setup-launch/link-health/visibility-link-audit routes that failed on `/people`, `/settings/user`, and `/dashboard`, followed by the uninterrupted Docker CI gate when lead-owned integration is ready
  Handoff notes: summarize retry/filter boundaries, any remaining WebKit-only evidence, and the exact focused rerun commands used
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-24: `P5-T2D` starts as a narrow `persona-proof-stability` lane while shared route catalogs, workboard updates, and persona-support reclassification stay lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: `persona-proof-stability`
  Other lanes: none
  Integration owner: Codex
- Lane: `persona-proof-stability`
  Goal: restore the narrow frontend persona report/portal proof slice without changing persona support claims or widening into browser/runtime drift
  Owned paths: `frontend/src/features/reports/pages/__tests__/ReportsHomePage.test.tsx`, `frontend/src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx`, `frontend/src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx`, `frontend/src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`, plus the smallest frontend test helper or source file needed to remove the timeout
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`, `docs/validation/**`
  Expected tests: `cd frontend && npm run type-check` plus the documented persona frontend slice in [../testing/TESTING.md](../testing/TESTING.md)
  Handoff notes: summarize the timeout root cause, exact frontend proof restored, and any host-only drift that must return to validation/runtime ownership
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-forms-contract`
  Goal: make the assignment-backed portal forms payload the canonical inbox contract and expose case-aware summary metadata without widening shared route seams
  Owned paths: `backend/src/modules/portal/**`, `backend/src/modules/cases/usecases/caseForms.usecase.portal.ts`, `backend/src/modules/cases/repositories/caseFormsRepository.ts`, `backend/src/validations/caseForms.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted portal/case-forms integration coverage plus module-local case-form portal tests
  Handoff notes: summarize canonical list/detail contract changes, added assignment summary metadata, and any frontend/doc follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-forms-inbox`
  Goal: make `/portal/forms` a case-aware assignment inbox with clearer active/completed workflow, case context, due dates, and canonical assignment-client usage
  Owned paths: `frontend/src/features/portal/**`, `frontend/src/types/caseForms.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted portal forms page and portal case-forms client coverage
  Handoff notes: summarize UI contract assumptions, filter/empty-state behavior, and any doc/E2E follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-docs-e2e`
  Goal: align portal docs and focused browser proof with the assignment-backed portal forms inbox and case-aware workflow wording
  Owned paths: `docs/features/FEATURE_MATRIX.md`, `docs/features/PORTAL_REALTIME_FILTERING.md`, `docs/features/CASE_CLIENT_VISIBILITY_AND_FILES.md`, `e2e/tests/portal-workspace.spec.ts`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: targeted Playwright portal workspace coverage plus `make check-links` when docs change
  Handoff notes: summarize doc wording changes and exact portal forms proof added
  Docs ownership: lane
  Disposition: `Review`
- Lane: `backend-mailchimp-campaigns`
  Goal: extend the existing Mailchimp campaign surface for draft, schedule, send, and preview-ready authoring without adding a new top-level API namespace
  Owned paths: `backend/src/modules/mailchimp/**`, `backend/src/services/mailchimpService.ts`, `backend/src/types/mailchimp.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted Mailchimp route-security and service coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize contract additions, outbound delivery assumptions, and any frontend/doc follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `backend-email-renderer`
  Goal: create an email-safe formatter and preview path by reusing template/rendering primitives without coupling blast-email behavior to website runtime assumptions
  Owned paths: `backend/src/services/template/**`, `backend/src/services/site-generator/**`, `backend/src/services/publishing/newsletterHtmlSanitizer.ts`
  Forbidden shared paths: `backend/src/modules/mailchimp/**`, `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted template helper and sanitization coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize preview/sanitization contracts and any frontend integration requirements
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-communications-workspace`
  Goal: turn the current communications workspace into the canonical blast-email operations surface while preserving `/settings/communications` and legacy `/settings/email-marketing`
  Owned paths: `frontend/src/features/mailchimp/**`, `frontend/src/features/adminOps/pages/**`, `frontend/src/features/adminOps/components/**`, `frontend/src/features/adminOps/api/adminHubApiClient.ts`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted communications/admin page coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize UI contract changes, preview flow assumptions, and any docs follow-up
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-email-builder`
  Goal: reuse editor and builder primitives for email composition and preview while keeping email composition data distinct from website template records
  Owned paths: `frontend/src/features/builder/**`, `frontend/src/features/builder/components/editor/**`
  Forbidden shared paths: `frontend/src/features/mailchimp/**`, `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted builder/editor preview coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize reusable editor primitives, email-safe preview assumptions, and any overlap requiring lead integration
  Docs ownership: lead
  Disposition: `Review`
- Lane: `frontend-builder-remediation`
  Goal: remove stale builder site context and add direct coverage for the extracted builder seams without changing shared routes
  Owned paths: `frontend/src/features/builder/**`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted builder hook/controller coverage plus `cd frontend && npm run type-check`
  Handoff notes: summarize site-context clearing behavior, shortcut behavior, and any editor-state assumptions
  Docs ownership: lead
  Disposition: `Review`
- Lane: `scheduled-reports-proof`
  Goal: make the scheduled-report helper split fully test-covered without changing runtime contracts
  Owned paths: `backend/src/modules/scheduledReports/**`, `backend/src/__tests__/services/scheduledReport*.test.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted scheduled-report unit coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize newly covered branches and any residual untestable paths
  Docs ownership: lead
  Disposition: `Review`
- Lane: `report-template-proof`
  Goal: make the report-template validator split and seed behavior visibly proved through negative-path tests
  Owned paths: `backend/src/modules/reports/services/reportTemplate*.ts`, `backend/src/__tests__/services/reportTemplateService.test.ts`
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`
  Expected tests: targeted report-template service coverage plus `cd backend && npm run type-check`
  Handoff notes: summarize negative-path coverage and any deferred validation hardening
  Docs ownership: lead
  Disposition: `Review`
- Lane: `docs-email-wave`
  Goal: align product/docs/testing language with the scoped blast-email authoring, preview, formatting, and delivery wave
  Owned paths: `docs/product/product-spec.md`, `docs/features/FEATURE_MATRIX.md`, `docs/features/TEMPLATE_SYSTEM.md`, `docs/testing/TESTING.md`
  Forbidden shared paths: `docs/phases/planning-and-progress.md`, `frontend/src/routes/**`, `backend/src/routes/v2/index.ts`
  Expected tests: `make check-links` plus `make lint-doc-api-versioning` when `/api/v2` wording changes
  Handoff notes: summarize docs wording changes and exact validation guidance added
  Docs ownership: lane
  Disposition: `Review`
- Lane: `fundraising-ops-brief`
  Goal: synthesize benchmark-backed fundraising carry-over on saved audiences, campaign-run history, donor preference/receipting, and the boundary into typed appeals; the narrow saved-audience, campaign-run, donor-profile default, route-validation, and webhook-hardening pickups are signed off through `P5-T3`
  Owned paths: planning docs plus the `P5-T3` Mailchimp/communications and receipt-default implementation seams when lead-owned
  Forbidden shared paths: broader typed appeal, restriction, donation-batch, membership, and generic workflow implementation files until separate scoped rows are signed out
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-01`, `PAT-02`, `PAT-03`, and `PAT-07` outcomes, concrete landing zones, smallest future type targets (`saved_audience`, `campaign_run`, `donor_profile`), and parity traps around Mailchimp lists/segments or `campaign_name`
  Docs ownership: lead
  Disposition: `Review`
- Lane: `portal-ops-brief`
  Goal: synthesize the next portal carry-over on shared public-intake resolution, reusable queue definitions, shared triage-shell reuse inside `PAT-05`, and typed portal escalations; the narrow `PAT-04`, `PAT-05`, and `PAT-06` pickups are now tied to the review-stage `P5-T5` runtime slice
  Owned paths: planning docs plus the `P5-T5` portal, public-intake, queue-view, and escalation implementation seams when lead-owned
  Forbidden shared paths: broader workflow studios, metadata builders, and later case-form revision review implementation until separate scoped rows are signed out
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-04`, `PAT-05`, and `PAT-06` outcomes, concrete landing zones, smallest future type targets (shared `public_intake_resolution`, `queue_view_definition`, `portal_escalation`), and parity traps around duplicate resolution, queue reuse, or over-widening the portal review slice
  Docs ownership: lead
  Disposition: `Review`
- Lane: `volunteer-dispatch-brief`
  Goal: synthesize the volunteer-dispatch carry-over on searchable event/task pickers, skill-fit reuse, and dispatch-oriented volunteer detail follow-through without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-14` outcomes, concrete landing zones, and the smallest active task/event picker contract needed for dispatch follow-through, plus parity traps around widening into a new volunteer domain model
  Docs ownership: lead
  Disposition: `Review`
- Lane: `finance-membership-brief`
  Goal: synthesize later-wave typed finance and constituent-lifecycle work on restrictions, donation batches, and memberships without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-09`, `PAT-10`, and `PAT-11` outcomes, concrete landing zones, smallest future type targets (`fund_designation`, `donation_batch`, `membership`), and parity traps around free-text designations, batchless finance review, or contact-role membership inference
  Docs ownership: lead
  Disposition: `Review`
- Lane: `workflow-program-ops-brief`
  Goal: synthesize domain-scoped workflow and program-ops follow-through on transition registries, service-point routing, and case-form approvals without direct repo edits
  Owned paths: none; analysis-only lane
  Forbidden shared paths: all repo-tracked files except lead-owned synthesis docs; report findings to the lead instead of editing directly
  Expected tests: none; evidence comes from current repo docs, the benchmark canon, and completed clone-review notes
  Handoff notes: provide ranked `PAT-08`, `PAT-12`, and `PAT-13` outcomes, concrete landing zones, smallest future type targets (a domain-scoped transition registry, `service_site`, expanded case-form approval states), and parity traps around opening a generic workflow studio or metadata builder
  Docs ownership: lead
  Disposition: `Review`
- Coordinated exception, 2026-04-25: `P5-T11A` is split across parallel implementation-size cleanup lanes while shared workboard, public type exports, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: `backend-cases-route-schemas`, `backend-mailchimp-service`
  Frontend lanes: `frontend-mailchimp-modal`
  Other lanes: none
  Integration owner: Codex
- Lane: `backend-cases-route-schemas`
  Goal: extract case route schemas into a route-local module without changing route registration order or request/response behavior
  Owned paths: `backend/src/modules/cases/routes/**`, cases backend tests
  Forbidden shared paths: `backend/src/routes/v2/index.ts`, `docs/phases/planning-and-progress.md`, frontend paths
  Expected tests: `cd backend && npm test -- --runInBand src/__tests__/integration/cases.test.ts` plus backend type-check handoff
  Handoff notes: summarize extracted schemas, route-order preservation, and any validation helper changes
  Docs ownership: lead
- Lane: `backend-mailchimp-service`
  Goal: extract Mailchimp campaign/audience helper logic while preserving public service facade exports and route behavior
  Owned paths: `backend/src/modules/mailchimp/services/**`, Mailchimp backend service tests
  Forbidden shared paths: `backend/src/modules/mailchimp/routes/**`, `backend/src/modules/mailchimp/controllers/**`, `docs/phases/planning-and-progress.md`, frontend paths
  Expected tests: `cd backend && npm test -- --runInBand src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts` plus backend type-check handoff
  Handoff notes: summarize extracted helpers, facade exports preserved, and any cycle-avoidance assumptions
  Docs ownership: lead
- Lane: `frontend-mailchimp-modal`
  Goal: move the campaign creation modal out of the oversized Mailchimp page-parts file without changing the communications workspace flow
  Owned paths: `frontend/src/features/mailchimp/components/**`, `frontend/src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`, backend paths
  Expected tests: `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx` plus frontend type-check handoff
  Handoff notes: summarize import/export shape and visible campaign creation behavior
  Docs ownership: lead
- Coordinated exception, 2026-04-25: `P5-T9B` is split as a frontend builder cleanup lane while shared workboard, compatibility notes, and final validation stay lead-owned.
  Lead: Codex
  Backend lanes: none
  Frontend lanes: `frontend-builder-shim-retirement`
  Other lanes: none
  Integration owner: Codex
- Lane: `frontend-builder-shim-retirement`
  Goal: retire root builder/editor/template component wrappers and migrate wrapper tests to feature-owned builder paths
  Owned paths: retired root wrappers under `frontend/src/components/editor/**` and `frontend/src/components/templates/**`, `frontend/src/features/builder/components/**`, `scripts/baselines/implementation-size.json`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`, backend paths
  Expected tests: migrated builder/editor Vitest slices plus `cd frontend && npm run type-check`
  Handoff notes: summarize removed wrappers, migrated tests, and any stale ownership references for lead cleanup
  Docs ownership: lead
- For future modularization exceptions, use the lane contract and workboard format in [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md).
- Move blocked work to `Blocked` with a reason and next step.
- Use task IDs in commits and pull request titles.

## Status Keys

| Status | Meaning |
|---|---|
| `In Progress` | Signed out and being worked. |
| `Blocked` | Waiting on a dependency or decision. |
| `Review` | Implementation landed and needs review or validation signoff. |
| `Ready` | Scoped and ready to pick up. |

## Phase 4 Carry-over

No live Phase 4 carry-over rows remain. Proof for the retired rows now lives in [archive/P4_FINAL_CLOSEOUT_2026-04-20.md](archive/P4_FINAL_CLOSEOUT_2026-04-20.md), [archive/P4_CLOSEOUT_BATCH_2026-04-20.md](archive/P4_CLOSEOUT_BATCH_2026-04-20.md), and [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md).

## Phase 5 Canonical Workboard

| ID | Task | Status | Owner | Next Step / Blocker | Evidence |
|---|---|---|---|---|---|
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Review | Codex | Keep live as the Phase 5 backlog scope-control gate: use the capability packet, backlog synthesis, and May 1 reference consolidation to reject unscoped implementation, and require separate signed-out rows for typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, local communications follow-through, or generic workflow tooling. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md), [archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_REVIEW_SIGNOFF_CLOSEOUT_BATCH_2026-04-25.md), [archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md](archive/P5_RUNTIME_REVIEW_CLOSEOUT_BATCH_2026-04-25.md) |
| P5-T44 | Typed fund designation and restriction registry | Review | Codex | Review migration `116`, typed designation API/service behavior, donation and recurring-plan linkage, reporting-safe labels, recurring invoice propagation, finance UI behavior, focused tests, type-checks, policy checks, manifest parity, and the Docker-dependent `make db-verify` blocker. | [../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md](../validation/P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md) |
| P5-T45 | Double opt-in for public newsletter signup | Review | Codex | Review migration `117`, pending/confirmed signup state, hashed confirmation tokens, generic public signup/confirmation responses, confirmation email links, CRM/provider handoff after confirmation, focused tests, type-checks, policy checks, manifest parity, and the Docker-dependent `make db-verify` blocker. | [../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md](../validation/P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md) |
