# Planning & Progress

**Last Updated:** 2026-05-08

Use this file only for live tracked work. Historical phase closeouts, earlier workboard material, and completed-row proof live in [archive/README.md](archive/README.md), [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md), and [../validation/README.md](../validation/README.md).

## At A Glance

| Snapshot | Value |
|---|---:|
| Current phase | Phase 5 - Email, Website, Portal, and Reliability |
| Active rows | 26 |
| In Progress | 0 |
| Review | 25 |
| Ready | 0 |
| Blocked | 1 |
| Phase 4 carry-over rows | 0 |
| Recent thread follow-through rows | 0 |

## Start Here

1. Check `Recent Thread Follow-through` first when resuming recent interrupted or disposed work.
2. Update the row before editing tracked work if owner, status, blocker, or next step changed.
3. Keep one canonical row per live task. Do not add summary-only rows.
4. When a row no longer owns a concrete next step, archive its proof and remove it from this live board.

## Recent Thread Follow-through

- No unfinished recent thread follow-through is currently tracked. Reopen this overlay only when a disposed or interrupted thread leaves a concrete next action.

## Priority Board

| Status | ID | Task | Immediate Next Move | Evidence |
|---|---|---|---|---|
| Review | P5-T91 | Full-stack queue-view modularity refactor | Review behavior-preserving queue-view modularity proof: backend implementation moved to shared module resources, frontend API/types moved to a canonical feature resource, and compatibility re-exports preserve existing imports. | [../validation/P5-T91_QUEUE_VIEW_MODULARITY_PROOF_2026-05-08.md](../validation/P5-T91_QUEUE_VIEW_MODULARITY_PROOF_2026-05-08.md) |
| Review | P5-T86 | Security remediation: tenant/session boundaries | Review tenant-scope and portal session-revision proof for external service providers, portal conversations, portal appointments/reminders, and portal password resets. | [../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md](../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md) |
| Review | P5-T87 | Security remediation: public ingress, rate limits, and validation | Review fail-closed public/provider ingress, non-caller-controlled rate-limit buckets, and public/staff boundary validation proof. | [../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md](../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md) |
| Review | P5-T88 | Security remediation: production secrets, redaction, backups, health/metrics, and scans | Review production secret policy, token redaction, guarded backup export, health/metrics protection, browser diagnostic redaction, and history-aware secret-scan proof. | [../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md](../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md) |
| Review | P5-T89 | Security remediation: dependency audit and Docker image policy | Review clean dependency audits and digest-pinned Docker image-policy proof; broader Docker CI/audit follow-on remains owned by `P5-T85`. | [../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md](../validation/P5-T86_T89_SECURITY_REMEDIATION_PROOF_2026-05-06.md) |
| Review | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Keep live as the scope-control gate. Use the capability packet, backlog synthesis, and reference consolidation to reject unscoped implementation; future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, local communications follow-through, and generic workflow tooling need separately signed-out rows. | [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md), [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md](../development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md) |
| Review | P5-T63 | Fence preview bootstrap auth modes | Review fake-auth removal, login-response cache seeding, and frontend proof. | [../validation/P5-T63_PREVIEW_BOOTSTRAP_AUTH_HARDENING_PROOF_2026-05-05.md](../validation/P5-T63_PREVIEW_BOOTSTRAP_AUTH_HARDENING_PROOF_2026-05-05.md) |
| Review | P5-T64 | Mailchimp campaign-run cancel/reschedule contract cleanup | Review explicit `405` cancel/reschedule route behavior and focused proof. | [../validation/P5-T64_MAILCHIMP_CANCEL_RESCHEDULE_CONTRACT_PROOF_2026-05-05.md](../validation/P5-T64_MAILCHIMP_CANCEL_RESCHEDULE_CONTRACT_PROOF_2026-05-05.md) |
| Review | P5-T65 | Outcomes report `programId` contract cleanup | Review strict contract cleanup that removes accepted `programId` query handling. | [../validation/P5-T65_OUTCOMES_REPORT_PROGRAM_ID_CONTRACT_PROOF_2026-05-05.md](../validation/P5-T65_OUTCOMES_REPORT_PROGRAM_ID_CONTRACT_PROOF_2026-05-05.md) |
| Review | P5-T67 | Retire or re-home legacy verification scripts | Review legacy verifier re-home; old scripts/docs are historical reproduction helpers and active verification remains Make plus `scripts/select-checks.sh`. | [../validation/P5-T67_LEGACY_VERIFICATION_REHOME_PROOF_2026-05-05.md](../validation/P5-T67_LEGACY_VERIFICATION_REHOME_PROOF_2026-05-05.md) |
| Review | P5-T70 | Local campaign failed-recipient retry policy | Review local-email failed-recipient retry route/service proof. | [../validation/P5-T70_LOCAL_CAMPAIGN_FAILED_RECIPIENT_RETRY_PROOF_2026-05-05.md](../validation/P5-T70_LOCAL_CAMPAIGN_FAILED_RECIPIENT_RETRY_PROOF_2026-05-05.md) |
| Review | P5-T71 | Public workflow browser proof sweep | Review focused browser proof for managed forms, public event registration, donation checkout, and public action blocks; dirty-checkout petition failure remains split to `P5-T78`. | [../validation/P5-T71_PUBLIC_WORKFLOW_BROWSER_PROOF_2026-05-05.md](../validation/P5-T71_PUBLIC_WORKFLOW_BROWSER_PROOF_2026-05-05.md) |
| Review | P5-T72 | Support-letter approval delivery/download polish | Review staff support-letter preview, copy, and download proof. | [../validation/P5-T72_T73_WEBSITE_CONSOLE_PUBLIC_ACTION_POLISH_PROOF_2026-05-05.md](../validation/P5-T72_T73_WEBSITE_CONSOLE_PUBLIC_ACTION_POLISH_PROOF_2026-05-05.md) |
| Review | P5-T73 | Public event and self-referral operational snapshots | Review operator snapshot and drilldown proof. | [../validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md](../validation/P5-T73_PUBLIC_EVENT_SELF_REFERRAL_OPERATIONAL_SNAPSHOTS_PROOF_2026-05-05.md) |
| Review | P5-T74 | Recurring donation provider-management parity | Review Stripe-preserving provider-management cleanup, local non-Stripe metadata edits, and unsupported non-Stripe action gates. | [../validation/P5-T74_RECURRING_DONATION_PROVIDER_MANAGEMENT_PROOF_2026-05-05.md](../validation/P5-T74_RECURRING_DONATION_PROVIDER_MANAGEMENT_PROOF_2026-05-05.md) |
| Blocked | P5-T75 | Auth alias deprecation gate | Managed time-gated blocker. Review telemetry and exceptions on June 17, 2026; July 1, 2026 is the earliest enforcement date. | [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md), [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md), [../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md](../validation/P5-T75_AUTH_ALIAS_GATE_HANDOFF_2026-05-05.md) |
| Review | P5-T76 | Browser telemetry and operator metrics next slice | Review Admin Hub browser-session diagnostics proof and focused validation. | [../validation/P5-T76_BROWSER_SESSION_DIAGNOSTICS_PROOF_2026-05-05.md](../validation/P5-T76_BROWSER_SESSION_DIAGNOSTICS_PROOF_2026-05-05.md) |
| Review | P5-T78 | Public action block submission regression | Review clean-main regression proof; dirty-checkout petition submission `500` did not reproduce. | [../validation/P5-T78_PUBLIC_ACTION_BLOCK_SUBMISSION_REGRESSION_PROOF_2026-05-05.md](../validation/P5-T78_PUBLIC_ACTION_BLOCK_SUBMISSION_REGRESSION_PROOF_2026-05-05.md) |
| Review | P5-T79 | Auth and session hardening remediation | Review password-reset session revocation, test-only MFA bypass, WebAuthn user verification, and strong password-change proof. | [../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md) |
| Review | P5-T80 | Portal and pending-account hardening remediation | Review tenant-scope, transactional approval, and pending-only resubmission uniqueness proof. | [../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md) |
| Review | P5-T81 | Accounts access and RLS hardening remediation | Review account admin-only write, tax-id policy, full data-scope, and RLS request-context proof. | [../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md) |
| Review | P5-T82 | Case-form review-gated mapping remediation | Review portal/public pending mapping audit and staff-reviewed application proof. | [../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md) |
| Review | P5-T83 | Public-action approval transition remediation | Review capture-only public submissions and staff accept/reject/fulfill side-effect proof. | [../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md) |
| Review | P5-T84 | Volunteer background-check approval remediation | Review generic-edit rejection and dedicated audited approval-route proof. | [../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md](../validation/P5-T79_T84_AUTH_ACCOUNTS_APPROVALS_REMEDIATION_PROOF_2026-05-05.md) |
| Review | P5-T85 | Docker stack efficiency refactor and fresh rebuild | Review deferred Docker CI/audit follow-up: fresh review stack, full desktop matrix with two rerun-clean Firefox flakes, mobile tail pass, and Docker audit pass. | [../validation/P5-T85_DOCKER_STACK_EFFICIENCY_PROOF_2026-05-06.md](../validation/P5-T85_DOCKER_STACK_EFFICIENCY_PROOF_2026-05-06.md) |
| Review | P5-T90 | Volunteer staff background-check approval follow-up | Review focused volunteer approval-flow proof; rerun the direct integration-route test once the local Jest DB listener is available. | [../validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md](../validation/P5-T90_VOLUNTEER_APPROVAL_FLOW_PROOF_2026-05-06.md) |

## Ready Queue

No row is currently ready.

## Current Phase Shape

- The Phase 5 roadmap lives in [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md).
- Completed Phase 5 planning, validation, runtime, cleanup, email, website, portal, and Docker rows are archived under [archive/README.md](archive/README.md).
- Durable validation and audit proof is indexed from [../validation/README.md](../validation/README.md).
- `P5-T6` remains the backlog-scope gate. Treat all future product expansion as new signed-out rows unless this board explicitly says otherwise.
- `P5-T86` through `P5-T89` are in review with focused security validation recorded, separate from `P5-T79` through `P5-T85` review proof; the deferred Docker CI/audit follow-up for `P5-T85` is now recorded in review.
- `P5-T90` is in validation/signoff review and stays scoped to volunteer staff background-check approval follow-up.
- `P5-T91` is in review with focused backend/frontend queue-view behavior proof plus root lint, typecheck, docs link, and diff checks recorded.

## Status Keys

| Status | Meaning |
|---|---|
| `In Progress` | Signed out and being worked. |
| `Blocked` | Waiting on a dependency, date, decision, environment, or external evidence. |
| `Review` | Implementation or proof landed and needs review/signoff. |
| `Ready` | Scoped and ready to pick up. |
