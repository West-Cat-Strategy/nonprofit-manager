# Planning & Progress

**Last Updated:** 2026-04-20

## At a Glance

- **Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
- **Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- **History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).

| Snapshot | Value |
|---|---|
| Active rows | 9 |
| In Progress | 1 |
| Blocked | 0 |
| Review | 1 |
| Ready | 7 |
| Phase 4 carry-over rows | 3 |
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

### Needs Attention Now

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Review | P4-T51 | Backend duplication remediation (report-sharing dedupe + contacts compatibility cleanup) | Review the final backend proof slice and close or fold the row into a narrower Phase 5 follow-up if new duplication remains. |
| In Progress | P5-T1 | Phase 5 docs, archive, benchmark, and persona-skill refresh | Land the tracked persona-analysis skill suite, route existing repo-local skills into it, and realign product/docs indexes without breaking docs or skill validation. |

### Ready Next

| Status | ID | Task | Immediate Next Move |
|---|---|---|---|
| Ready | P4-T9I | Auth alias telemetry dashboard/query follow-up | Stand up the production dashboard/query flow in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md). |
| Ready | P4-T49 | Aggressive dead-code prune + compatibility retirement | Finish the remaining compatibility-doc cleanup and retire any last admin-settings wrapper or stale contributor references. |
| Ready | P5-T2 | Full Playwright/E2E pass plus test coverage and testing-strategy review | Run the full host and Docker Playwright lanes early in Phase 5, audit coverage gaps, and publish a testing strategy note with recommended CI/runtime changes. |
| Ready | P5-T3 | Email platform wave: blast email plus email builder/formatter | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. |
| Ready | P5-T4 | Website surfaces wave: website builder plus public website | Prioritize builder editing UX, publish/runtime reliability, public-site forms, and contributor/runtime docs for the website surface. |
| Ready | P5-T5 | Client portal wave | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. |
| Ready | P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. |

## Current Phase Shape

- Phase 5 starts with planning and docs refresh plus an early full Playwright/E2E and testing-strategy review.
- Product execution then centers on blast email plus the email builder/formatter, website builder plus public website, and the client portal.
- Follow-on backlog from repo review and external benchmarking stays visible as later Phase 5 work rather than hidden in archive notes.

## Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- There are no active coordinated exceptions.
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

| ID | Task | Status | Owner | Next Step / Blocker | Evidence |
|---|---|---|---|---|---|
| P4-T51 | Backend duplication remediation (report-sharing dedupe + contacts compatibility cleanup) | Review | Codex | Review the final backend proof slice and close or fold the row into a narrower Phase 5 follow-up if new duplication remains. | 2026-04-20 `make test-backend` (1779/1779 green) |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Ready | Codex | Stand up the production dashboard/query flow in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md). | [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md) |
| P4-T49 | Aggressive dead-code prune + compatibility retirement | Ready | Codex | Finish the remaining compatibility-doc cleanup and retire any last admin-settings wrapper or stale contributor references. | 2026-04-19 deleted-path guard proof |

## Phase 5 Canonical Workboard

| ID | Task | Status | Owner | Next Step / Blocker | Evidence |
|---|---|---|---|---|---|
| P5-T1 | Phase 5 docs, archive, benchmark, and persona-skill refresh | In Progress | Codex | Land the tracked persona-analysis skill suite, route existing repo-local skills into it, and realign product/docs indexes and instructions without breaking docs or skill validation. | 2026-04-20 docs refresh, archive restructure, benchmark draft, and persona-skill implementation in progress |
| P5-T2 | Full Playwright/E2E pass plus test coverage and testing-strategy review | Ready | Codex | Run the full host and Docker Playwright lanes early in Phase 5, audit coverage gaps, and publish a testing strategy note with recommended CI/runtime changes. | TBD |
| P5-T3 | Email platform wave: blast email plus email builder/formatter | Ready | Codex | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T4 | Website surfaces wave: website builder plus public website | Ready | Codex | Prioritize builder editing UX, publish/runtime reliability, public-site forms, and contributor/runtime docs for the website surface. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T5 | Client portal wave | Ready | Codex | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Ready | Codex | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. | [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md) |
