# Validation & Audit Index

**Last Updated:** 2026-05-03

Use this index for active validation references first, and the validation archive second. For live task ownership, blockers, and next steps, use [../phases/planning-and-progress.md](../phases/planning-and-progress.md) instead of treating these files as a workboard. Detailed persona-validation methodology now lives in tracked skill references.

For Phase 5 validation work, treat the proof sequence as host first and Docker second: update the active validation note with the current `make ci-full` status before recording any follow-on `cd e2e && npm run test:docker:ci` or `cd e2e && npm run test:docker:audit` results.

## Start Here

1. Open [../phases/planning-and-progress.md](../phases/planning-and-progress.md) first when the task is tracked or resumed.
2. Check `Recent Thread Follow-through` before scanning the larger active table when you are continuing recent interrupted work.
3. Use [../testing/TESTING.md](../testing/TESTING.md) for command selection, runtime-aware validation guidance, and the current host-then-Docker proof order.
4. Use this directory when you need current validation references or the archive handoff for older review artifacts.

## Active Validation Docs

| Artifact | Type | Use |
|---|---|---|
| [AUTH_ALIAS_USAGE_REPORT_2026-04-14.md](AUTH_ALIAS_USAGE_REPORT_2026-04-14.md) | Operational evidence note | Current deprecation-readiness snapshot for legacy auth alias telemetry and the linked dashboard/query workflow |
| [PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md) | Active validation note | Current six-persona UI/UX workflow audit covering route-contract proof, board read-only posture, thin browser anchors, and documented unmet persona needs |
| [P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md](P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md) | Superseded row-local proof note | Historical GitHub CI/security pilot closeout proof; superseded by the `P5-T20` local-only CI/CD refactor and the `make release-check` gate |
| [P5-T15_CASE_HANDOFF_PACKET_PROOF_2026-04-28.md](P5-T15_CASE_HANDOFF_PACKET_PROOF_2026-04-28.md) | Row-local proof note | Case handoff packet API/UI closeout proof, visibility-boundary UI coverage, and local isolated-DB blocker note |
| [P5-T17_GITHUB_BUILD_ARTIFACTS_PROOF_2026-04-27.md](P5-T17_GITHUB_BUILD_ARTIFACTS_PROOF_2026-04-27.md) | Superseded row-local proof note | Historical GitHub build-artifact proof; SBOM generation and Docker validation now run locally through `make release-check` |
| [P5-T26_T32_NEWSLETTER_EMAIL_OPERABILITY_PROOF_2026-05-01.md](P5-T26_T32_NEWSLETTER_EMAIL_OPERABILITY_PROOF_2026-05-01.md) | Row-local proof note | Newsletter/email operability closeout proof for reference refresh, CRM audience selection, campaign preflight/test-send, run actions, Mailchimp webhook back-sync, website newsletter sync, and tag/segment API reachability |
| [P5-T33_T34_CAMPAIGN_REPORTING_SUPPRESSION_PROOF_2026-05-01.md](P5-T33_T34_CAMPAIGN_REPORTING_SUPPRESSION_PROOF_2026-05-01.md) | Row-local proof note | Campaign reporting metrics and communication suppression governance proof, including provider report summary, suppression ledger migration, focused tests, type-checks, DB verification, and docs hygiene |
| [P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md](P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md) | Row-local proof note | Local-first communications refactor proof for provider-neutral APIs, queued SMTP delivery, newsletter provider defaults, optional Mailchimp compatibility, frontend workspace behavior, DB verification, and docs hygiene |
| [P5-T36_COMMUNICATIONS_LOCAL_FIRST_DOCS_HANDOFF_2026-05-01.md](P5-T36_COMMUNICATIONS_LOCAL_FIRST_DOCS_HANDOFF_2026-05-01.md) | Superseded docs-readiness handoff | Pre-implementation docs-readiness note retained for traceability; final proof lives in `P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md` |
| [P5-T37_T39_REFERENCE_IMPROVEMENTS_PROOF_2026-05-01.md](P5-T37_T39_REFERENCE_IMPROVEMENTS_PROOF_2026-05-01.md) | Row-local proof note | Reference-improvement implementation proof for local campaign queue controls, staff-only case-form evidence events, scheduled-report health, audit-log health states, migrations, focused tests, type-checks, DB verification, and policy checks |
| [P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md](P5-T40_UI_UX_PLAIN_LANGUAGE_AUDIT_2026-05-01.md) | Active audit note | UI/UX plain-language cleanup scope for eligible non-case/non-people pages, including alerts/notifications, portal wording, admin/settings vocabulary, dense staff-page simplification, and shared state behavior |
| [P5-T41_CASE_FORM_TEMPLATE_BUILDER_PROOF_2026-05-01.md](P5-T41_CASE_FORM_TEMPLATE_BUILDER_PROOF_2026-05-01.md) | Row-local proof note | Case-form template library, assignment customization, autosave, email/SMS/portal opening, reference-repo provenance, migration parity, focused tests, and known unrelated frontend type-check blocker |
| [P5-T42_WEBSITE_PUBLIC_ACTION_EXPANSION_PROOF_2026-05-01.md](P5-T42_WEBSITE_PUBLIC_ACTION_EXPANSION_PROOF_2026-05-01.md) | Row-local proof note | Website public-action expansion proof for typed action/submission provenance, blog/campaign content entries, petition signatures, donation pledges, support-letter draft metadata, staff console actions, public runtime forms, type-checks, focused tests, and DB verification |
| [P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md](P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md) | Row-local proof note | Local SMTP campaign unsubscribe proof for signed recipient tokens, public no-leak GET/POST unsubscribe routes, CSRF-compatible one-click POST through the `/api/v2` registrar, API-only unsubscribe links, Docker dev API-origin alignment, `List-Unsubscribe` headers, contact suppression evidence, focused tests, type-check, policy checks, and Docker-dependent validation blockers |
| [P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md](P5-T44_TYPED_FUND_DESIGNATIONS_PROOF_2026-05-02.md) | Row-local proof note | Typed fund designation proof for organization-scoped designation records, donation and recurring-plan linkage, reporting-safe labels, recurring invoice propagation, focused backend/frontend tests, type-checks, policy checks, manifest parity, docs hygiene, and Docker-dependent `make db-verify` blocker |
| [P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md](P5-T45_NEWSLETTER_DOUBLE_OPT_IN_PROOF_2026-05-02.md) | Row-local proof note | Public newsletter double opt-in proof for pending confirmation state, hashed tokens, confirmation email links, no-leak confirmation routes, CRM/provider handoff after confirmation, focused tests, type-checks, policy checks, manifest parity, and Docker-dependent `make db-verify` blocker |
| [P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md](P5-T67_T71_READY_TOOLING_BROWSER_PROOF_2026-05-03.md) | Row-local proof note | Ready-tooling compatibility wrapper proof and focused public browser proof coverage for managed website forms, public event registration, donation checkout, and P5-T42 public action blocks without runtime behavior changes |
| [WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md](WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md) | Active audit note | Website-builder editor, website console, shared contract, public runtime, managed-form, and E2E proof findings; `P5-T21` fix-now follow-through and `P5-T22` drag/drop hardening are implemented while broader authoring/runtime refactors remain queued |
| [PHASE_5_SECURITY_REVIEW_2026-04-22.md](PHASE_5_SECURITY_REVIEW_2026-04-22.md) | Active review note | Current security-focused Phase 5 review covering fresh scan results, supply-chain and tooling recommendations, and the `P5-T2B` security-hardening sub-lane |
| [PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) | Active review note | Live Phase 5 validation note for the green `P5-T12` host `make ci-full`, fresh-stack Docker CI, fresh-stack Docker audit proof, and retained `P5-T2B` validation history |
| [P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) | Active review note | Row-local closeout and validation proof for the one-form managed website publish loop across backend, website-console, builder, docs/E2E follow-through, and now-green shared validation gate |
| [VALIDATION_SCHEMAS_REFERENCE.md](VALIDATION_SCHEMAS_REFERENCE.md) | Reference doc | Validation-schema patterns, examples, and supporting code references |
| [Persona Validation Rubric](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md) | Tracked skill reference | Canonical methodology for persona workflow audits and support-status classification |
| [Persona Findings Template](../../.codex/skills/nonprofit-manager-persona-validation/references/findings-template.md) | Tracked skill reference | Default structure for new persona validation artifacts |

## Phase 5 Proof Order

1. Run or review the host validation gate first through `make ci-full`.
2. When the host gate is stable enough to continue, run or review the Docker follow-ons in order: `cd e2e && npm run test:docker:ci`, then `cd e2e && npm run test:docker:audit`.
3. The `P5-T12` host/Docker sequence is signed off in [../phases/archive/P5_CLOSEOUT_PROOF_BATCH_2026-04-28.md](../phases/archive/P5_CLOSEOUT_PROOF_BATCH_2026-04-28.md); keep future validation changes in an active note until their host/Docker sequence is complete, then move only dated, closed, or superseded material into the archive.

## Archive

Historical audit snapshots, remediation trackers, and strategic review artifacts now live under [archive/README.md](archive/README.md).

- Use the archive when you need dated findings context or older verification evidence.
- Keep in-progress Phase 5 lane status in the active validation note until the current host gate and any follow-on Docker evidence are recorded.
- Treat archived remediation trackers as historical closeout notes, not as live workboards.
- When a task resumes from an archived artifact, confirm the live workboard row first and then use the archived snapshot or tracker for context.

## Related Docs

- [../testing/TESTING.md](../testing/TESTING.md)
- [../README.md](../README.md)
- [../development/AGENT_INSTRUCTIONS.md](../development/AGENT_INSTRUCTIONS.md)
- [../phases/planning-and-progress.md](../phases/planning-and-progress.md)
