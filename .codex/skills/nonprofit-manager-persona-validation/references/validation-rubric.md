# Validation Rubric

Use this rubric when validating persona claims against the current repo.

## Validation Goal

Determine what the repo currently proves about a persona workflow without blurring three different kinds of signal:

1. `Confirmed repo evidence`
2. `Inference`
3. `External analog guidance`

## Status Definitions

| Status | Use when |
|---|---|
| `supported` | The workflow is product-native and stable enough for repeated day-to-day use |
| `partial` | Core pieces exist, but key steps still rely on workaround flows, unstable surfaces, or outside process |
| `external only` | The app provides context or inputs, but the main workflow outcome happens outside the product |
| `missing` | The workflow has no practical in-product realization today |

## Evidence Ladder

Rank evidence from strongest to weakest:

1. Passing runtime proof tied to the workflow
2. Passing targeted tests for the relevant surface
3. Current mounted routes, permissions, and implementation seams
4. Current tracked docs and feature references
5. Archived findings and historical artifacts
6. External analogs

Use the highest available evidence first. Do not let a lower rung silently overrule a higher rung.

## Required Sections For A Persona Validation Pass

- `Scope`
- `Workflows checked`
- `Confirmed repo evidence`
- `Inference`
- `External analog guidance`
- `Current gaps or drift`
- `Commands run or attempted`
- `High-signal evidence paths`

## Handling Interrupted Or Blocked Proof

- Record blocked or interrupted attempts explicitly.
- Explain whether the block is:
  - harness or runtime contention
  - missing configuration
  - flaky evidence
  - genuine product mismatch
- Do not downgrade a workflow solely because the chosen proof path was blocked if stronger current repo evidence still exists elsewhere.

## Writing Rules

- Prefer precise file paths over broad repo claims.
- Keep each workflow conclusion short and reproducible.
- When the conclusion depends on an inferred role mapping, restate the mapping and confidence inline.
