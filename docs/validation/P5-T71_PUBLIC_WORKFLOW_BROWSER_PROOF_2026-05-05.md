# P5-T71 Public Workflow Browser Proof

Date: 2026-05-05

## Scope

Added focused browser proof for public managed forms, public donation checkout,
public action blocks, and the existing public-event starter registration path.
The new proof lives in `e2e/tests/public-workflows.spec.ts` and drives the
public runtime through the browser rather than asserting only backend fixtures.

- Creates a temporary published website.
- Publishes managed contact and donation forms.
- Submits contact and donation forms through the public runtime and verifies the
  resulting contact and donation rows.
- Publishes petition, donation-pledge, and support-letter action blocks.
- Submits public action blocks through the browser and verifies stored public
  action submissions.
- Keeps runtime contract changes out of this proof lane.

## Validation

| Command | Result |
|---|---|
| `cd e2e && npm run test -- --project=chromium tests/public-workflows.spec.ts` in `/Users/bryan/projects/nonprofit-manager-p5-t71-browser` | Passed; 1 browser test covered managed forms, donation checkout, and public action blocks |
| `cd e2e && npm run test -- --project=chromium tests/public-website.spec.ts --grep "renders the nonprofit starter"` in `/Users/bryan/projects/nonprofit-manager` | Passed; 1 browser test covered the existing public starter/event-registration path |
| `cd e2e && npm run test -- --project=chromium tests/public-workflows.spec.ts` in `/Users/bryan/projects/nonprofit-manager` | Failed in the dirty lead checkout because the petition action submission returned backend `500` with correlation ID `393141da-0462-449f-a4e9-30e7ca43c04f`; managed contact and donation form submissions had already passed before that failure |
| `make check-links` | Passed in the lead checkout after proof/index reconciliation; checked 198 files and 1518 local links |
| `git diff --check` | Passed in the lead checkout after proof/index reconciliation |

## Follow-up

The clean worker proof passed, while the dirty lead checkout exposed a current
public action runtime regression. It is tracked separately as `P5-T78` so this
proof lane does not widen into runtime implementation.

Failure artifacts from the lead checkout:

- `e2e/test-results/public-workflows-Public-wo-bdc61--through-the-public-runtime-chromium/error-context.md`
- `e2e/test-results/public-workflows-Public-wo-bdc61--through-the-public-runtime-chromium/test-failed-1.png`
