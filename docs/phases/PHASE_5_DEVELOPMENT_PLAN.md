# Phase 5 Development Plan

**Last Updated:** 2026-04-25

Use this document for the Phase 5 roadmap and sequencing. Use [planning-and-progress.md](planning-and-progress.md) for row-level tracked status.

## Summary

Phase 5 shifts the project from Phase 4 modularization and hardening closeout into product execution on three primary surfaces:

- Blast email plus the email builder/formatter
- Website builder plus the public website runtime
- Client portal workflows

Phase 5 still starts from docs, benchmark, and validation groundwork so later product work lands on a cleaner planning surface and a stronger testing contract.

Phase 5 is no longer at its kickoff shape. `P5-T1` is complete, `P5-T2A` is the published testing-strategy review artifact, `P5-T2B` has a green final uninterrupted Docker CI artifact, `P5-T2C`, `P5-T4`, `P5-T6`, `P5-T6A`, `P5-T6B`, `P5-T6C`, and `P5-T6D` are in `Review`, and `P5-T3` plus `P5-T5` remain the active runtime waves.

## Phase 5 Goals

### Primary Product Goals

- Ship a stronger outbound messaging surface with reusable email composition and formatting.
- Improve the website builder authoring experience and the reliability of the public website runtime.
- Expand and polish the client portal as a first-class product surface.

### Enabling Goals

- Keep `docs/phases/` focused on live planning only.
- Run the full Playwright/E2E and testing-strategy review early enough to shape the rest of the phase.
- Keep active email, website, and portal work behind explicit auth, audit, rate-limit, and supply-chain expectations instead of leaving security follow-through in archived audits.
- Refresh contributor docs and repo-local skills so future work routes cleanly.
- Use OSS benchmarking to drive the backlog instead of rediscovering well-known nonprofit CRM patterns from scratch.

## Execution Order

### 1. Phase Transition And Planning Refresh (Completed)

- Refresh the workboard and create this Phase 5 plan.
- Move Phase 4 proof/history behind the phase archive index.
- Update contributor docs, docs indexes, runtime guidance, and repo-local skills.
- Publish the OSS benchmark and initial tooling evaluation.

### 2. Shared Validation Gate And Testing Review (Review)

- Keep `P5-T2A` as the canonical testing-strategy review artifact; `P5-T2B` now has the final uninterrupted `cd e2e && npm run test:docker:ci` artifact.
- Host coverage, auth-alias operations handoff, fresh starter-only Docker MFA proof, Docker smoke, and Docker dark-mode audit are green in targeted proof.
- Treat security baseline and observability as part of `P5-T2B`: keep `make security-scan`, the auth and rate-limit policy scripts, the auth-alias operational handoff, and row-local security acceptance criteria current while the row waits for final signoff.
- Do not widen `P5-T2B` unless a future review rerun surfaces a new owning-seam failure.

### 3. Product Wave: Email Platform (Active In Parallel)

- Keep the builder-local modularity cleanup scoped to behavior-preserving editor follow-through while `P5-T2C` stays in review as functionally proof-complete.
- Keep `/api/v2/mailchimp/*` and `/settings/communications` as the canonical campaign contract and staff workspace.
- The current `borrow now` runtime pickup is limited to internal saved audiences, run-specific provider static-segment targeting, campaign-run history, and donor-profile receipt defaults. Keep those attached to the live Mailchimp, communications, and tax-receipt seams.
- Keep typed appeals, fund restrictions, donation batches, memberships, and broader campaign ROI outside `P5-T3` until separate scoped rows are signed out.

### 4. Review Findings Remediation (Review)

- Keep `P5-T2C` in `Review` as the dedicated row for the surfaced code-review findings instead of widening `P5-T2B` or `P5-T3`.
- Treat the row as functionally proof-complete: targeted builder remediation tests, scheduled-report proof, report-template proof, and backend/frontend package type-checks are green in the current tree.
- Keep optional hardening deferred unless a future `P5-T2B` rerun points back here, and leave shared host validation, security operations, wider email authoring, and persona-proof timeout work with their parent rows.

### 5. Product Wave: Website Surfaces (Review Pending Shared Signoff)

- Keep the one-form managed publish loop in `Review` against the green shared Docker CI artifact.
- Avoid reopening website scope unless the shared validation gate or review findings require it.

### 6. Product Wave: Client Portal (Active In Parallel)

- Keep the assignment-backed forms inbox slice as the current green baseline.
- The scoped portal pickup after forms, case-aware appointments continuity, is now landed in targeted backend/frontend proof and focused Chromium browser proof.
- The current `borrow now` portal pickup is limited to shared public-intake resolution, server-backed queue view definitions, and case-scoped portal escalations. Public-intake audit inserts are best effort and must not block the source intake action, queue views stay owner/surface/permission scoped, and portal escalations must preserve actor attribution across portal and staff actors.
- Use persona and benchmark follow-through to sharpen later program-service workflow work, not to over-claim current portal parity.

### 7. Later-Wave Backlog And Enabling Tooling (Review)

- Keep `P5-T6` in `Review` with [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md) published alongside [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md).
- Keep `P5-T6A` in `Review` with [P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md](P5-T6A_GOVERNANCE_COMPLIANCE_BRIEF_2026-04-24.md) as the planning artifact.
- Keep `P5-T6B` in `Review` with [P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md](P5-T6B_FUNDRAISING_STEWARDSHIP_RESTRICTIONS_BRIEF_2026-04-25.md) as the fundraising stewardship and restrictions planning artifact.
- Keep `P5-T6C` in `Review` with [P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md](P5-T6C_SERVICE_DELIVERY_WORKFLOW_DEPTH_BRIEF_2026-04-24.md) as the planning artifact.
- Treat `P5-T6D` as the only signed-out runtime carry-over from the current packet: the volunteer assignment event/task picker slice is in `Review` with the existing assignment contract preserved.
- Do not authorize any other runtime `P5-T6` implementation until a separate scoped row is signed out; typed appeals, restrictions, donation batches, memberships, finance breadth, and generic workflow tooling remain queued.

## Workstreams

| Row | Scope | Main Outputs | Dependencies | Exit Criteria |
|---|---|---|---|---|
| `P5-T1` | Docs, archive, benchmark, and skills refresh | Live Phase 5 workboard, benchmark doc, archive cleanup, contributor/runtime docs, refreshed skills | none | Top-level `docs/phases/` reads as live planning only; benchmark and touched skills validate cleanly |
| `P5-T2A` | Testing-strategy review artifact and findings | Published review note, coverage gap summary, recommended CI/runtime updates | `P5-T1` docs/runtime cleanup | The review artifact stays current while `P5-T2B` waits for final signoff on the green Docker CI artifact |
| `P5-T2B` | Shared validation lane stabilization | One uninterrupted `cd e2e && npm run test:docker:ci` artifact after the final dashboard fix, plus the live security baseline and auth-alias operational visibility | `P5-T2A` plus active owning-surface fixes | Row is in `Review`; the final Docker CI artifact is green without surfacing a new owning-seam failure, and the live security baseline stays current enough to stop gating later Phase 5 signoff |
| `P5-T2C` | Review findings remediation | Stale builder site-context fix, extracted builder seam regression coverage, scheduled-report helper and service proof, report-template negative plus seed-resilience proof, and package type-check proof | `P5-T2A` review findings plus current module-local refactors | Row is in `Review` and functionally proof-complete while optional hardening remains deferred unless `P5-T2B` points back here |
| `P5-T3` | Blast email and email builder/formatter | Feature plan, implementation slice, validation slice, provider static-segment saved-audience targeting, campaign-run history, and donor-profile receipt-default handoff | `P5-T2B` for final shared signoff, but active lane work continues in parallel | Authoring, preview, formatting, delivery, saved-audience targeting, and donor-profile receipt defaults are reviewable with explicit tests while typed appeals/restrictions stay queued |
| `P5-T4` | Website builder and public website | Builder UX follow-through, publish/runtime reliability, public-site validation | `P5-T1`, `P5-T2B` | Builder and public runtime docs/tests match the current surface and the row clears final shared validation signoff |
| `P5-T5` | Client portal | Portal workflow slices across forms, appointments, public intake, queue views, typed escalations, messaging, and client-facing navigation | `P5-T2B` for final shared signoff plus portal prioritization | The forms and appointments slices are green, the current hardening pickup stays limited to `PAT-04` through `PAT-06`, and targeted proof matches the public-intake, queue-view, and portal-escalation contracts |
| `P5-T6` | Later-wave backlog from research and repo review | Published capability brief packet, backlog synthesis, explicit `borrow now`, `queue for P5-T6`, and `reject` decisions, plus tooling recommendations | benchmark + `P5-T3`/`P5-T5` handoffs | Row is in `Review`; `P5-T6A`, `P5-T6B`, and `P5-T6C` are in review against published planning briefs, and no runtime implementation starts without a new signed-out scoped row |
| `P5-T6A` | Governance and compliance oversight brief | Published later-wave governance/compliance planning brief | `P5-T6` capability brief packet | Row is in `Review`; board-only posture, governance-risk escalation, board packet workflow, retention, and corrective-action scope are captured while annual filing and legal review remain external only |
| `P5-T6B` | Fundraising stewardship and restrictions brief | Small fundraiser-depth planning brief | `P5-T3` handoff plus current donor-profile receipt-default pickup | Row is in `Review`; saved audiences, campaign-run history, and donor-profile defaults are mapped to live seams while typed appeals, restrictions, donation batches, memberships, and broader fundraising runtime work remain queued |
| `P5-T6C` | Service-delivery workflow depth brief | Published later-wave service-delivery planning brief | `P5-T5` handoff | Row is in `Review`; reassessment cadence, handoff packets, closure continuity, rehab planning artifacts, and authorization/referral depth are mapped to mounted cases, services, appointments, and portal surfaces while runtime work stays blocked on a future scoped row |
| `P5-T6D` | Volunteer assignment dispatch radar | Active event/task pickers in the existing volunteer assignment form | `P5-T6` capability brief packet plus current volunteer assignment contract | Assignment creation/editing no longer requires staff to paste raw event/task UUIDs, existing assignment payloads remain compatible, and no new volunteer domain model or shared route seam is opened |

## Completed Phase Inputs

The early Phase 5 repo review already produced the following durable planning inputs, and they should now be treated as completed groundwork rather than as live cleanup:

- Contributor docs needed a current archive/live split, public-site runtime guidance, worker runtime guidance, and explicit workspace documentation.
- Feature inventory needed to match actual routed surfaces instead of earlier Phase 4 framing.
- Skills needed better resumption guidance, cleaner runtime ownership, and clearer audit routing.

### Product Backlog From Benchmarking

- Memberships, appeals, and richer donor/member outreach depth
- Metadata-driven forms, workflow/approval builders, and configurable schema extensions
- Nonprofit finance operations such as stronger reconciliation and project-restricted donation handling
- Program-service patterns such as registry/program/payment separation, richer case templates, and workflow scaffolding

### Governance And Compliance Backlog

The archived executive-director remediation tracker surfaced a governance/compliance slice that should stay visible as later-wave backlog instead of living in a closed validation tracker:

- Dedicated governance-risk escalation workspace for executive and board follow-through
- Board conflict-of-interest disclosure and recusal workflow
- Delegation-authority matrix and committee charter traceability
- Annual board and 990 compliance command center, while keeping legal review and filing workflows explicitly external where needed
- Compliance-documentation vault and retention workflow for governance, audit, and records-management artifacts

## Tooling Evaluation

### Phase 5 Follow-Through Candidates

- OWASP ASVS 5.0 plus OWASP API Security Top 10 2023 crosswalk: turn auth, access-control, logging, SSRF, and admin-flow security into explicit acceptance criteria for active Phase 5 lanes instead of archived audit context.
- GitHub CodeQL plus dependency review, Dependabot alerts or security updates, and secret scanning push protection when GitHub-backed CI is available; otherwise mirror the same controls in the existing CI system instead of treating local scans as sufficient.
- `npm sbom` now, with CycloneDX later if multi-workspace BOM depth or downstream consumers justify it: add release-time supply-chain visibility before adding heavier signing or attestation expectations.
- Semgrep in non-blocking mode first: use custom rules for repo-specific guardrails such as no unsafe outbound fetch without SSRF controls, no sensitive logging regressions, and no missing auth or rate-limit protections on critical routes.
- Trivy repo and image scanning if Docker build and deploy paths remain central to Phase 5 release confidence: fill the current gap around image, IaC, and broader misconfiguration scanning.
- `Redocly CLI` or `Spectral`: lint `docs/api/openapi.yaml` so the machine-readable spec becomes trustworthy enough for code generation and contract-drift checks.
- `@hey-api/openapi-ts`: pilot generated clients and validators on one active domain once the OpenAPI trust gate exists, instead of attempting repo-wide generation immediately.
- Playwright harness cleanup patterns plus a repo-local `make test-e2e-docker-fresh` helper: keep the host-vs-Docker contract explicit, follow native `webServer`/`reuseExistingServer` and stored-auth-state patterns where they reduce drift, and give the Docker-only MFA proof a dedicated fresh-volume path.
- `make doctor` and `make check-changed --run`: preflight local runtime prerequisites and turn the changed-files selector into an executable shared entrypoint for contributors and hooks.

### Later Backlog Candidates

- `@tanstack/react-form`: improve complex authoring and settings flows with a stronger form-state model.
- `@tanstack/react-table`: standardize dense admin/data surfaces without imposing a visual system.
- OpenTelemetry JS: add standardized backend traces and metrics across auth, payments, webhooks, and runtime-critical flows, while keeping current plans realistic about JS logs still being in development and browser instrumentation still being experimental.
- Volta or `mise` plus `engines` / `packageManager`: reduce version drift once the current validation bottlenecks are no longer the shortest path to Phase 5 confidence.
- Repo-local module or extension generator: reduce repetitive setup for new modules, docs, and validation wiring after the active product waves settle.

### Decision Rule

- Borrow platform patterns and tooling where they reduce drift or repetitive work.
- Prefer the smallest tool addition that removes an active bottleneck before adopting broader infrastructure polish.
- Avoid stacking overlapping scanners or provenance tools unless the team has a clear triage owner and release-path consumer for the signal.
- Do not rewrite the stack to match other projects; keep the current TypeScript/React/Express/Postgres architecture.

## External Benchmarks

The current benchmark and follow-on references live in [../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md](../product/OPEN_SOURCE_NONPROFIT_CRM_BENCHMARK_2026-04.md).

Primary analogs:

- CiviCRM for nonprofit-native fundraising, memberships, and campaign workflows
- OpenSPP and Sahana Eden for service-program and case-management patterns
- OpenPetra for nonprofit finance operations
- ERPNext and SuiteCRM for metadata-driven customization and workflow tooling

## Exit Criteria

Phase 5 is on track when:

- The live workboard and Phase 5 plan stay current without leaking historical proof back into top-level `docs/phases/`.
- The early Playwright/E2E and testing-strategy review is complete, and `P5-T2B` keeps its final uninterrupted Docker CI artifact in review for signoff.
- The live security baseline and supply-chain follow-through are explicit tracked inputs to `P5-T2B` rather than orphaned notes or one-off scans.
- `P5-T2C` stays functionally proof-complete in `Review` without silently widening scope.
- Email, website, and portal work each have explicit tracked rows with current validation guidance, including database verification for migrations `103` through `107` when those hardening slices are touched.
- The benchmark doc, tooling evaluation, `P5-T6` capability briefs, `P5-T6A` governance/compliance brief, `P5-T6B` fundraising stewardship/restrictions brief, and `P5-T6C` service-delivery workflow depth brief remain visible inputs to later-wave backlog decisions, with runtime work blocked until a separate scoped row is signed out.
