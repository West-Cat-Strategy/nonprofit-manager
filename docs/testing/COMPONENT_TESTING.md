# Component Testing

**Last Updated:** 2026-05-07

Use this guide for frontend component and feature-slice test patterns. Use [TESTING.md](TESTING.md) for command selection, runtime contracts, and validation gates.

## Current Tooling

- Frontend component tests use Vitest and Testing Library.
- Run focused tests from `frontend/` with `npm test -- --run <paths>`.
- Pair meaningful component changes with `cd frontend && npm run type-check`.
- Add `cd frontend && npm run lint` when the change touches lint-sensitive shared code or feature-boundary policy.

## Default Pattern

1. Render the component through the smallest existing provider wrapper that matches production state.
2. Prefer user-visible queries such as role, label, text, and accessible name.
3. Interact through Testing Library user events.
4. Assert visible state, emitted payloads, route calls, or API-client calls.
5. Avoid broad snapshots unless the component is intentionally snapshot-owned.

## What To Test

| Change | Component-Test Focus |
|---|---|
| Form behavior | Required fields, validation messages, submitted payload, disabled/loading states |
| Data table or dense panel | Empty, loading, error, populated, overflow, sort/filter/action state |
| Route/page shell | Permission gates, key calls, visible headings/actions, failed-load handling |
| API-client integration seam | Request payload, response normalization, error handling |
| Accessibility-sensitive UI | Labels, roles, focus behavior, keyboard-accessible controls |
| Public/portal-adjacent UI | No staff-only actions, token/link state, safe error messages |

## Recommended Commands

```bash
cd frontend
npm test -- --run path/to/test.tsx
npm run type-check
```

For broader frontend confidence:

```bash
cd frontend
npm test -- --run
npm run type-check
npm run lint
```

Use [TESTING.md](TESTING.md) before widening to Playwright, Docker, or repo-wide gates.

## Guardrails

- Do not recreate retired `frontend/src/pages/**` ownership for tests.
- Keep tests near feature-owned code under `frontend/src/features/**` when possible.
- Prefer existing test utilities and API-client mocks over ad hoc setup.
- Keep browser-level assertions in Playwright when behavior depends on routing, real navigation, storage, or full runtime wiring.
- Record row-local proof in [../validation/README.md](../validation/README.md) when the workboard requires a proof note.

## Related Docs

- [TESTING.md](TESTING.md)
- [../development/CONVENTIONS.md](../development/CONVENTIONS.md)
- [../../frontend/README.md](../../frontend/README.md)
- [../../e2e/README.md](../../e2e/README.md)
