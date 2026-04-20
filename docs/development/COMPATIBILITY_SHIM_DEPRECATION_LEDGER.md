# Compatibility Shim Deprecation Ledger

**Last Updated:** 2026-04-20

This ledger tracks shims retained for wave-safe compatibility and their planned retirement. At present, there are no active root shim files in the current tree; the remaining legacy payment surface is the tombstoned `/api/payments/*` path.

| Legacy surface | Canonical replacement | Why kept | Sunset target |
| --- | --- | --- | --- |
| `/api/payments/*` | `backend/src/modules/payments/routes/index.ts` via `paymentsV2Routes` | Legacy requests still need migration guidance while external callers finish moving to `/api/v2/payments/*`. | Retired once no caller depends on the tombstone behavior. |

## Remediation notes

- Keep shim comments explicit with `@deprecated`, replacement target, and sunset note to preserve migration intent.
- Remove a shim only after all known importers migrate and policy gates are green for the affected domain.
- `backend/src/modules/payments/routes/index.ts` is the canonical payment route implementation.
- The legacy `/api/payments/*` surface is tombstoned; do not reintroduce a root `backend/src/routes/payments.ts` shim file.
- The frontend deleted-path guards now treat `frontend/src/pages/**` as fully retired; do not add that path back to the tree or to the shim inventory.
