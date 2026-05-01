# P5-T35 Finance, Governance, and Evidence Reference Refresh

**Last Updated:** 2026-05-01

This note captures a planning-only reference refresh for later finance, governance, and evidence work. It does not authorize runtime implementation, widen `P5-T6`, or permit direct source copying.

## Reference Set

| Repo | License | Reuse posture | Current nonprofit-manager takeaway |
|---|---|---|---|
| `nm--fineract` | Apache-2.0 | `adopt_selectively` | Useful for maker-checker, accounting-control, idempotent job, and reporting discipline; avoid borrowing the lending or banking product model. |
| `nm--blnk` | Apache-2.0 | `adopt_selectively` | Useful for ledger API vocabulary, balance projections, reconciliation boundaries, and idempotent transaction/event handling; do not transplant it as a finance module. |
| `nm--ledgersmb` | GPL-2.0 | `reference_only` | Compare-only source for GL, reconciliation, invoices, exports, and report vocabulary; no source copying. |
| `nm--docuseal` | AGPL-3.0 with additional terms | `reference_only` | Compare-only source for signature templates, submissions, evidence state, and webhook proof; no source copying. |

## Borrowable Patterns

| Pattern | Landing zone | Boundary |
|---|---|---|
| Maker-checker and finance approval checkpoints | Future donation batch, fund designation, and finance-export rows | Keep approval states tied to typed finance actions; do not open a generic approval studio. |
| Idempotent finance event and reconciliation vocabulary | Future fund designation, donation batch, and materialized finance-reporting rows | Use local donation/reporting contracts first; do not import ledger internals. |
| Evidence-backed governance submissions | Future governance/compliance document and signature-evidence rows | Keep evidence records append-only and attributable; do not build a standalone e-signature product. |
| Export/report field groups | Future board packet, public finance snapshot, and finance export rows | Build report projections from local models; avoid full GL or fiscal-host parity claims. |

## Candidate Follow-Through

- Keep `P5-T33` focused on provider-fed campaign metrics and the typed appeal/ROI boundary.
- Keep `P5-T34` focused on communication suppression governance.
- Future finance runtime rows should start with typed fund designation policy, then donation batches, then membership lifecycle.
- Future governance/evidence runtime rows should start with compliance-document retention and signature/submission evidence, not a general document-signing platform.
- Twenty remains a proposed modern CRM UX reference only. It needs a separate official-source and license verification pass before adding a local clone or manifest entry, and should remain reference-only because its license is mostly AGPL with enterprise-marked files.

## Deferred Candidates

- DHIS2 and OpenSRP remain deferred until closure-continuity ambiguity is resolved in the service-delivery backlog.
- KoBoToolbox KPI and OpenMRS Core are not priority additions for this wave because the existing case/form/service references already cover the near-term seams more directly.

## Validation Path

- Reference/docs-only changes: `node /Users/bryan/projects/reference-repos/scripts/validate-reference-index.mjs`, `make check-links`, `git diff --check`, and `jq empty reference-repos/manifest.lock.json /Users/bryan/projects/reference-repos/docs/index.json`.
- Runtime rows that borrow from this note need separate workboard signout, migration proof when schema changes, and targeted backend/frontend tests for their owning domain.
