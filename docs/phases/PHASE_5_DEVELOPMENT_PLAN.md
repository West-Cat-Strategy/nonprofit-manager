# Phase 5 Development Plan

**Last Updated:** 2026-05-07

Use this document for the Phase 5 roadmap and sequencing. Use [planning-and-progress.md](planning-and-progress.md) for row-level status, ownership, blockers, and review state.

## Summary

Phase 5 moved the project from Phase 4 modularization and hardening into product execution across three primary surfaces:

- Outbound messaging, email composition, provider compatibility, and local-first campaign delivery
- Website builder, website console, public website runtime, public actions, and publishing reliability
- Client portal workflows, public intake, appointments, messaging, forms, and operational review surfaces

Most early Phase 5 groundwork is now signed off and archived. The live board currently keeps `P5-T6` as the later-wave backlog scope-control gate, several review rows for May 2026 remediation/proof, and the time-gated `P5-T75` auth-alias blocker.

## Current Roadmap

| Area | Current Posture | Source |
|---|---|---|
| Live tracked work | Review/blocker state only; no Ready rows on this branch snapshot | [planning-and-progress.md](planning-and-progress.md) |
| Email and communications | Local Email is the primary newsletter/blast path; Mailchimp remains explicit optional-provider compatibility | [archive/P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md](archive/P5_COMMUNICATIONS_LOCAL_FIRST_CLOSEOUT_2026-05-01.md), [../validation/P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md](../validation/P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md) |
| Website and public runtime | Managed forms, public actions, site console polish, browser proof, and public workflow proof are review/signoff or archived proof lanes | [../validation/README.md](../validation/README.md) |
| Client portal | Portal appointments, forms, messages, intake, queue views, and escalation work are signed off or review-state proof rows | [planning-and-progress.md](planning-and-progress.md), [../validation/README.md](../validation/README.md) |
| Security and reliability | Auth/session, tenant/RLS, approval transitions, Docker efficiency, and auth-alias deprecation are tracked in review or blocked rows | [planning-and-progress.md](planning-and-progress.md), [../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md](../security/AUTH_ALIAS_DEPRECATION_CHECKLIST.md) |
| Later-wave backlog | `P5-T6` remains a scope gate, not runtime authorization | [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md), [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md) |

## Phase Goals

### Product Goals

- Keep communications provider-neutral while preserving explicit optional-provider surfaces.
- Keep website/public runtime work scoped to authoring, publishing, public actions, and operational proof rows.
- Expand portal workflows only through signed-out rows with focused proof.
- Keep security-sensitive public, portal, account, approval, and auth behavior behind explicit validation evidence.

### Enabling Goals

- Keep `docs/phases/` focused on live planning and current roadmap shape.
- Keep completed proof in [archive/README.md](archive/README.md) and [../validation/README.md](../validation/README.md).
- Keep testing and release confidence local-first through [../testing/TESTING.md](../testing/TESTING.md), Make targets, and `scripts/select-checks.sh`.
- Use external benchmark/reference work to sharpen backlog rows without silently widening runtime scope.

## Execution Rules

- No runtime `P5-T6` implementation starts without a separate signed-out row.
- Completed rows leave this plan as summary posture and move their details to the archive and validation indexes.
- Shared seams stay lead-owned during coordinated work: workboard, route registrars, route catalogs, root store wiring, worker startup, auth/permission policy, shared API clients, docs/proof, and final validation.
- Host proof comes before Docker proof when a validation lane calls for both.
- Security-sensitive changes must preserve row-local proof in [../validation/README.md](../validation/README.md).

## Backlog Boundaries

The following remain later-wave backlog until separately scoped:

- Typed appeals, restrictions, donation batches, memberships, finance breadth, and richer stewardship workflows
- Governance-risk, board conflict, delegation-authority, 990/compliance, and compliance-documentation vault workflows
- Service-site routing, closure continuity, generic workflow tooling, configurable schema, and approval/workflow builders
- Broader observability and tracing beyond row-local telemetry or monitoring slices
- Generated client/tooling adoption beyond a narrow OpenAPI trust gate

## Archived Phase Inputs

Detailed row-by-row history is intentionally not repeated here. Use these indexes instead:

- [archive/README.md](archive/README.md) for phase closeouts and earlier workboard history
- [../validation/README.md](../validation/README.md) for active proof and audit notes
- [../development/reference-patterns/README.md](../development/reference-patterns/README.md) for retained reference-pattern evidence
- [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md) for benchmark summary

## Exit Criteria

Phase 5 stays healthy when:

- The live board reflects only rows that still own concrete work.
- Product work lands through scoped rows with matching proof notes.
- Archived closeouts and validation indexes carry historical evidence instead of active roadmap pages.
- Local validation and release gates remain the documented source of confidence.
- Later-wave backlog remains explicit and does not leak into current rows without signout.
