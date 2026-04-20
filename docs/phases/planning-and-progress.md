# 📊 Nonprofit Manager - Planning & Progress

**Last Updated:** 2026-04-20

**Current Phase:** Phase 5 - Email, Website, Portal, and Reliability
**Live Snapshot:** 9 active rows: 0 In Progress, 0 Blocked, 2 Review, 7 Ready.
**Phase 5 Plan:** [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
**History:** Historical phase closeouts, transition notes, and earlier workboard material live under [archive/README.md](archive/README.md) and [archive/WORKBOARD_HISTORY_2026.md](archive/WORKBOARD_HISTORY_2026.md).
**Recent thread follow-through:** 0 rows.

## How To Use This Workboard

- Use this file only for tracked work. If the task is not tracked, you do not need to edit the workboard.
- Before editing tracked work, find the active row, confirm ownership and status, and update it first if the scope, blocker, or handoff state changed.
- When resuming recent interrupted work, check `Recent Thread Follow-through` before scanning the larger active table.
- Use this file for current tracked status instead of archived phase notes, closeout artifacts, or dated validation snapshots.
- Keep Phase 4 carry-over visible here until it is closed or explicitly folded into a Phase 5 row.
- When a row no longer owns a concrete next step, move its proof to an archive or validation artifact and remove it from the live table.

## Current Phase Shape

- Phase 5 starts with planning/docs refresh and an early full Playwright/E2E plus testing-strategy review.
- Product execution then centers on blast email plus the email builder/formatter, website builder plus public website, and the client portal.
- Follow-on backlog from repo review and external benchmarking stays visible as later Phase 5 work rather than hidden in archive notes.

## 🤝 Coordination

- Update this file before editing tracked work.
- Keep one active task per agent by default unless a coordinated exception is documented here.
- There are no active coordinated exceptions.
- For future modularization exceptions, use the lane contract and workboard format in [../development/SUBAGENT_MODULARIZATION_GUIDE.md](../development/SUBAGENT_MODULARIZATION_GUIDE.md).
- Move blocked work to `Blocked` with a reason and next step.
- Use task IDs in commits and PR titles.

## Status Keys

- `In Progress`: signed out and being worked.
- `Blocked`: waiting on a dependency or decision.
- `Review`: implementation landed and needs review or validation signoff.
- `Ready`: scoped and ready to pick up.

## Recent Thread Follow-through

- No unfinished recent thread follow-through is currently tracked. Reopen this overlay only when a disposed or interrupted thread leaves a concrete next action.

## Phase 4 Carry-over

| ID | Task | Status | Owner | Next Step / Blocker | Evidence |
|----|------|--------|-------|---------------------|----------|
| P4-T51 | Backend duplication remediation (report-sharing dedupe + contacts compatibility cleanup) | Review | Codex | Review the final backend proof slice and close or fold the row into a narrower Phase 5 follow-up if new duplication remains. | 2026-04-20 `make test-backend` (1779/1779 green) |
| P4-T9I | Auth alias telemetry dashboard/query follow-up | Ready | Codex | Stand up the production dashboard/query flow in [../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md](../security/AUTH_ALIAS_TELEMETRY_OPERATIONS_GUIDE.md). | [../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](../validation/AUTH_ALIAS_USAGE_REPORT_2026-04-14.md) |
| P4-T49 | Aggressive dead-code prune + compatibility retirement | Ready | Codex | Finish the remaining compatibility-doc cleanup and retire any last admin-settings wrapper or stale contributor references. | 2026-04-19 deleted-path guard proof |

## Phase 5 Workboard

| ID | Task | Status | Owner | Next Step / Blocker | Evidence |
|----|------|--------|-------|---------------------|----------|
| P5-T1 | Phase 5 docs, archive, and benchmark refresh | Review | Codex | Land the workboard/Phase 5 plan refresh, archive cleanup, benchmark doc, and contributor-doc sync without breaking docs or skill validation. | 2026-04-20 docs refresh, archive restructure, benchmark draft, and touched skill validation |
| P5-T2 | Full Playwright/E2E pass plus test coverage and testing-strategy review | Ready | Codex | Run the full host and Docker Playwright lanes early in Phase 5, audit coverage gaps, and publish a testing strategy note with recommended CI/runtime changes. | TBD |
| P5-T3 | Email platform wave: blast email plus email builder/formatter | Ready | Codex | Scope outbound campaign flow, email authoring/formatting needs, delivery reliability, preview/testing, and reuse of existing template/mailchimp surfaces. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T4 | Website surfaces wave: website builder plus public website | Ready | Codex | Prioritize builder editing UX, publish/runtime reliability, public-site forms, and contributor/runtime docs for the website surface. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T5 | Client portal wave | Ready | Codex | Plan and execute portal UX, messaging/documents/forms/appointments follow-through, with persona and workflow audit support. | [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md) |
| P5-T6 | Follow-on backlog: workflow/customization, memberships/appeals, finance/program ops | Ready | Codex | Use the benchmark and repo audit to shape the later-wave backlog for metadata-driven workflows, fundraising depth, and nonprofit-specific program/finance ops. | [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md) |
