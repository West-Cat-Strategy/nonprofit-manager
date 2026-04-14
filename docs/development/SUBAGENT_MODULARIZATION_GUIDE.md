# Subagent Modularization Guide

**Last Updated:** 2026-04-14

Use this guide when a tracked modularization task needs coordinated parallel contributors. The default remains one active task per agent. Parallel lanes are an exception that must be documented on the live workboard before implementation starts.

## When To Use Subagents

Use subagents only when all of the following are true:

- The task is tracked in [../phases/planning-and-progress.md](../phases/planning-and-progress.md).
- The task is large enough that one owner would otherwise block progress across clearly separate module or feature seams.
- The split can follow existing repo ownership boundaries.
- One lead agent is available to own shared seams, cross-lane conflicts, and final integration.

Do not split work by arbitrary file chunks or by mixing backend, frontend, and docs ownership without a clear lane contract.

## Default Ownership Model

- Keep one lead agent for shared seams only:
  `docs/phases/planning-and-progress.md`,
  `backend/src/routes/v2/index.ts`,
  `frontend/src/routes/**`,
  shared route or store contract tests,
  and final validation selection.
- Delegate backend work by module boundary under `backend/src/modules/<domain>/`.
- Delegate frontend work by feature boundary under `frontend/src/features/<domain>/`.
- Hold compatibility shims as cleanup-only territory:
  do not grow new business logic in `backend/src/services/*`,
  do not reintroduce `frontend/src/pages/**`,
  and keep legacy-shape normalization in test helpers rather than production state.

## Preferred Delegation Lanes

Choose the narrowest safe lane that matches the task.

### Backend

- `reports` / `savedReports` / `scheduledReports`
- `webhooks`
- `payments` / `recurringDonations`
- `socialMedia`
- one isolated owner each for `contacts` and `cases` only when the scoped behavior stays internal to that module

### Frontend

- `adminOps`
- `contacts` / `cases`
- `websites` / `builder`
- `reports` / `navigation`
- `portal`
- split `engagement` into owned subfeatures such as `events`, `tasks`, `cases`, `followUps`, and `teamChat` instead of assigning one umbrella lane

For frontend monoliths, extract from the inside out: local hooks, controller helpers, panels, and tab subcomponents first. Avoid shared route composition files unless the lead explicitly owns that work.

## Lane Contract Template

Every delegated lane should be documented with the same contract:

- Goal: one sentence describing the lane outcome
- Owned paths: the only repo paths the lane may edit without coordination
- Forbidden shared paths: registrar, route-catalog, workboard, or other lead-owned files
- Expected tests: the narrowest required validation for the lane
- Handoff notes: what the lane must report back for integration
- Docs ownership: whether the lane may update docs directly or must hand doc changes to the lead

Use this format when assigning work:

```md
- Lane: reports-navigation
  Goal: complete the feature-owned report controller split without changing shared route contracts
  Owned paths: `frontend/src/features/reports/**`, `frontend/src/features/navigation/**`
  Forbidden shared paths: `frontend/src/routes/**`, `docs/phases/planning-and-progress.md`
  Expected tests: targeted Vitest for reports/navigation plus route-catalog tests only if ownership changes
  Handoff notes: summarize contract changes, touched tests, and any required lead follow-up
  Docs ownership: lead
```

## Workboard Entry Format

Before any parallel work begins, add a coordinated-exception note to [../phases/planning-and-progress.md](../phases/planning-and-progress.md) with the parent task, delegated lanes, and integration owner.

Use this format in the Coordination section:

```md
- Coordinated exception, YYYY-MM-DD: `<TASK-ID>` is split across parallel lanes.
  Lead: `<owner>`
  Backend lanes: `<lane list>`
  Frontend lanes: `<lane list>`
  Other lanes: `<docs/validation/scripts lanes or none>`
  Integration owner: `<owner>`
```

Reuse existing tracked modularization rows when possible instead of inventing new untracked work.

## Integration Order

Integrate in this order when the work spans shared contracts:

1. Backend module lane if it changes runtime contracts
2. Frontend feature lane
3. Lead-owned registrar or route-catalog updates
4. Docs and workboard closeout

If a real runtime interface must change, the lead should reserve the interface file and land that shared change once. Dependent lanes should then rebase or adapt to the lead-owned interface rather than editing the same contract in parallel.

## Validation Expectations

- Per backend lane: run module-local tests and add shared router or policy tests only if route registration, auth guards, or workspace-module gating changed.
- Per frontend lane: run feature-local tests and add route or store contract tests when route ownership or reducer shape changed.
- Lead integration pass: run the smallest repo-native command set that honestly covers the merged lanes. Prefer root commands such as `make lint`, `make typecheck`, and `make test` when the scope is broad.

Typical shared contract checks:

- backend route-construction and reference-pattern route tests
- frontend route catalog and redirect tests
- root reducer shape tests
- `make check-links` when docs or workboard text changes

## Defaults And Non-Goals

- Parallel work is an exception, not the baseline workflow.
- The lead owns conflict resolution across lanes.
- Parallelization must not change public API behavior on its own.
- The safest default slice is a full-stack domain seam: backend module, frontend feature, and local tests, with shared registrars and catalogs held by the lead.
