# Validation & Audit Index

**Last Updated:** 2026-04-26

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
| [P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md](P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md) | Active validation note | Row-local proof tracker for the first GitHub CI/security pilot, required check contexts, repository security settings, and branch protection |
| [PHASE_5_SECURITY_REVIEW_2026-04-22.md](PHASE_5_SECURITY_REVIEW_2026-04-22.md) | Active review note | Current security-focused Phase 5 review covering fresh scan results, supply-chain and tooling recommendations, and the `P5-T2B` security-hardening sub-lane |
| [PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md) | Active review note | Live Phase 5 validation note for the green `P5-T12` host `make ci-full`, fresh-stack Docker CI, fresh-stack Docker audit proof, and retained `P5-T2B` validation history |
| [P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md](P5-T4_MANAGED_FORM_PUBLISH_LOOP_REVIEW_2026-04-20.md) | Active review note | Row-local closeout and validation proof for the one-form managed website publish loop across backend, website-console, builder, docs/E2E follow-through, and now-green shared validation gate |
| [VALIDATION_SCHEMAS_REFERENCE.md](VALIDATION_SCHEMAS_REFERENCE.md) | Reference doc | Validation-schema patterns, examples, and supporting code references |
| [Persona Validation Rubric](../../.codex/skills/nonprofit-manager-persona-validation/references/validation-rubric.md) | Tracked skill reference | Canonical methodology for persona workflow audits and support-status classification |
| [Persona Findings Template](../../.codex/skills/nonprofit-manager-persona-validation/references/findings-template.md) | Tracked skill reference | Default structure for new persona validation artifacts |

## Phase 5 Proof Order

1. Run or review the host validation gate first through `make ci-full`.
2. When the host gate is stable enough to continue, run or review the Docker follow-ons in order: `cd e2e && npm run test:docker:ci`, then `cd e2e && npm run test:docker:audit`.
3. The current `P5-T12` host/Docker sequence is green as of 2026-04-26; keep future validation changes in the active note until their host/Docker sequence is complete, then move only dated, closed, or superseded material into the archive.

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
