# Phase 4 Lean-Board Closeout Batch

**Last Updated:** 2026-04-20


**Date:** 2026-04-20

This artifact preserves the proof chain for rows removed from the live workboard during the 2026-04-20 lean-board refresh. These rows no longer own a concrete next step on the live board. Future work should reopen as narrower tracked rows instead of restoring the old proof-only or umbrella rows.

## Summary

- Removed resolved review rows from the live board so [../planning-and-progress.md](../planning-and-progress.md) returns to actionable tracked work only.
- Preserved standalone proof artifacts where they already existed and summarized row-local proof here where a separate closeout note was unnecessary.
- Removed umbrella rows `P4-T6`, `P4-T1R4`, and `P4-T9` because they no longer own a concrete next step; later work should reopen as narrower rows.
- Folded `P4-T53` into the still-blocked `P4-T51` row rather than leaving two blocked backend import/export rows live.

## Removed And Rerouted Rows

| Row | Disposition | Evidence |
|---|---|---|
| `P4-T47` | Removed from live board; proof-only. | Repo-side scrub remains complete and the prepared support payload stays archived in [P4-T47_GITHUB_SUPPORT_PURGE_2026-04-19.md](P4-T47_GITHUB_SUPPORT_PURGE_2026-04-19.md). No further GitHub Support escalation is planned. |
| `P4-T45` | Removed from live board; proof-only. | 2026-04-19 remediation wave landed with targeted backend/frontend tests, `make db-verify`, `make check-links`, host Chromium portal route-health proof, and the dark-mode list pass all green in the integrated tree. |
| `P4-T7E-DARK` | Removed from live board; proof-only. | 2026-04-20 full Chromium dark-mode rerun passed and the refreshed report at `e2e/test-results/dark-mode-accessibility-report.md` now records 152 audited routes with 27 moderate findings, 0 critical, 0 blocked. |
| `P4-T35` | Removed from live board; proof-only. | 2026-04-19 compact-shell rerun closed with targeted frontend suites plus `cd e2e && npm run test:ci:mobile` green in the integrated tree. |
| `P4-T1R4` | Removed from live board; umbrella row no longer owns a concrete next step. | Historical keep-in-review context remains in [P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T1R4_CLUSTER_CLOSEOUT_2026-04-14.md). Later follow-through landed on the row and the meetings child closure now has a dedicated artifact at [P4-T1R4W3F_CLOSEOUT_2026-04-20.md](P4-T1R4W3F_CLOSEOUT_2026-04-20.md). Future work should reopen as narrower reports, analytics, or admin-branding tasks if needed. |
| `P4-T1R4W3B` | Removed from live board; proof-only. | 2026-04-19 row-local proof closed the remaining activities contract-alignment gap with feature-owned frontend consumers, targeted frontend tests, and frontend `type-check` green. |
| `P4-T1R4W3C` | Removed from live board; proof-only. | 2026-04-18 row-local proof confirmed the `frontend/src/features/webhooks/**` boundary, route-seam stability, targeted frontend tests, and frontend `type-check`. |
| `P4-T1R4W3D` | Removed from live board; proof-only. | 2026-04-18 row-local proof confirmed the feature-owned Mailchimp workspace, admin-route stability, dedicated backend route-security coverage, targeted frontend tests, and frontend/backend `type-check` slices. |
| `P4-T1R4W3E` | Removed from live board; proof-only. | 2026-04-19 row-local proof closed the staff invitation-management extraction with feature-owned invitations hooks/utilities and targeted frontend tests plus frontend `type-check`. |
| `P4-T6` | Removed from live board; umbrella row no longer owns a concrete next step. | Historical cluster context remains in [P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md](P4-T6_CLUSTER_CLOSEOUT_2026-04-14.md). The parent row stayed broader than its child proof and should reopen later only as a narrower workflow or portal task. |
| `P4-T6A` | Removed from live board; proof-only. | 2026-04-19 row-local proof confirmed the viewer-forbidden follow-ups contract with targeted backend integration reruns green. |
| `P4-T6D` | Removed from live board; proof-only. | 2026-04-19 row-local proof confirmed the portal forms receipt/resubmission behavior plus notes/reminders paging with targeted frontend tests and frontend `type-check` green. |
| `P4-T7` | Removed from live board; umbrella row no longer owns a concrete next step. | Its remaining runtime and critical accessibility follow-through was completed through `P4-T7E-DARK`; the refreshed dark-mode report at `e2e/test-results/dark-mode-accessibility-report.md` now serves as the durable backlog boundary for advisory moderate findings. |
| `P4-T7C` | Removed from live board; proof-only. | 2026-04-19 row-local proof closed the remaining website/builder navigation hardcoding with targeted frontend tests and frontend `type-check` green. |
| `P4-T7E` | Removed from live board; proof-only. | Dedicated closeout remains in [P4-T7E_CLOSEOUT_2026-04-18.md](P4-T7E_CLOSEOUT_2026-04-18.md). |
| `P4-T9` | Removed from live board; umbrella row no longer owns a concrete next step. | Coverage and E2E harness follow-through landed, while the dark-mode audit status is now fully closed in [../validation/archive/repo-audit-2026-04-18-remediation.md](../validation/archive/repo-audit-2026-04-18-remediation.md). Any later setup or harness drift should reopen as a narrower validation task instead of restoring the parent row. |
| `P4-T10` | Removed from live board; proof-only. | 2026-04-19 row-local proof closed the remaining contacts export gap so default exports omit `phn`, explicit PHN export stays privileged, and targeted export/service tests passed. |
| `P4-T16B` | Removed from live board; proof-only. | 2026-04-18 MFA/TOTP replacement proof landed with `speakeasy`, shared TOTP helper coverage, backend `type-check`, and the targeted MFA integration suite green. |
| `P4-T48` | Removed from live board; proof-only. | 2026-04-19 row-local proof closed the backend default-instantiation half of the case-form builder work with provenance storage and targeted backend use-case coverage green. |
| `P4-T50` | Removed from live board; proof-only. | 2026-04-20 row-local proof closed the startup/bootstrap lane with `make typecheck` and the host Chromium auth-bootstrap plus startup-performance slice green. |
| `P4-T52` | Removed from live board; proof-only. | 2026-04-19 docs-navigation cleanup landed with contributor-doc refreshes, `make check-links`, and `git diff --check` green. |
| `P4-T53` | Removed from live board; absorbed into `P4-T51`. | 2026-04-19 row-local import/export follow-through landed, but the remaining blocked proof commands are the same shared backend lint and Jest DB-baseline failures already tracked on live row `P4-T51`. |
| `P4-T54` | Removed from live board; proof-only. | 2026-04-20 fresh-workspace persona and MFA proof closed with the first-admin role-sync fix, targeted backend auth tests, and the fresh Docker-backed persona proof green. Live remediation status remains indexed in [../validation/archive/executive-director-persona-findings-2026-04-20-remediation.md](../validation/archive/executive-director-persona-findings-2026-04-20-remediation.md). |

## Notes

- The live workboard now keeps only rows with a concrete next step, blocker, or external operational handoff.
- Proof-only rows belong here or in a dedicated standalone closeout artifact, not in the live table.
- Historical audit snapshots remain immutable; current disposition should be tracked in the live workboard or the relevant live remediation tracker.
