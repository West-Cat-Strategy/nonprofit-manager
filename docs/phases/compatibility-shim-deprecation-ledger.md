# Compatibility Shim Deprecation Ledger

**Last updated:** March 13, 2026

This ledger tracks shims retained for wave-safe compatibility and their planned retirement.

| Shim file | Canonical replacement | Why kept | Sunset target |
| --- | --- | --- | --- |
| `backend/src/routes/payments.ts` | `@modules/payments` via `createPaymentsRoutes` | Legacy v1 route mount compatibility for the `/api/payments/*` surface. | `P4-T1R7` completion |

## Remediation notes

- Keep shim comments explicit with `@deprecated`, replacement target, and sunset note to preserve migration intent.
- Remove a shim only after all known importers migrate and policy gates are green for the affected domain.
- `P4-T1R7` retired the dead backend payment controller/domain export shims plus the builder/finance/engagement page wrappers after the importer sweep turned up no runtime callers.
