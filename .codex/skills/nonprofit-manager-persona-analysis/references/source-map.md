# Source Map

Use this file to rebuild persona context quickly without overloading the main `SKILL.md`.

## Read Order

1. `docs/phases/planning-and-progress.md` for tracked or resumed work
2. `references/persona-schema.md`
3. The detailed persona file for the role:
   - `references/governance-and-revenue-personas.md`
   - `references/service-delivery-personas.md`
4. `references/workflow-models.md` when the question depends on daily workflow support
5. Supporting repo docs only as needed

## Evidence Discipline

- Prefer `Confirmed repo evidence` first: routes, permissions, implementation seams, tracked docs, and passing tests.
- Label anything that is not explicit in the repo as `Inference`.
- Treat outside-the-app outcomes, such as board packets, filings, grievance handling, and external communications, as workflow boundaries rather than hidden product gaps unless the repo proves otherwise.
- Use benchmark sources only to sharpen expectations after the repo conclusion is already clear.

## Canonical Detailed Layer

- `references/persona-schema.md`
- `references/governance-and-revenue-personas.md`
- `references/service-delivery-personas.md`
- `references/workflow-models.md`

## Summary Docs

These tracked docs summarize and navigate to the persona canon instead of duplicating it:

- `docs/product/user-personas.md`
- `docs/product/persona-workflows.md`
- `docs/product/README.md`

## Local Repo Evidence

- `docs/product/product-spec.md`
- `docs/features/FEATURE_MATRIX.md`
- `docs/features/REPORTING_GUIDE.md`
- `docs/features/CASE_MANAGEMENT_SYSTEM.md`
- `docs/features/FOLLOW_UP_LIFECYCLE.md`
- `docs/features/CASE_CLIENT_VISIBILITY_AND_FILES.md`
- `docs/api/API_REFERENCE_PORTAL_APPOINTMENTS.md`
- `backend/src/utils/permissions.ts`
- `backend/src/utils/roleSlug.ts`
- `backend/src/modules/admin/usecases/roleCatalogUseCase.ts`

## Validation Surfaces

Use these when you need the tracked persona contract, a fast UX smoke check, or runtime proof:

- `frontend/src/test/ux/personaWorkflowMatrix.ts` when you need the canonical persona-to-route/workflow contract or want to keep route and workflow IDs aligned.
- `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx` when you need a quick first-touch route UX check for headings, route posture, and console-error regressions.
- `e2e/tests/persona-workflows.spec.ts` when you need seeded end-to-end proof that the persona workflows still work against the live runtime.

## Validation And Historical Inputs

- `docs/validation/README.md`
- `docs/validation/archive/README.md`
- `docs/validation/archive/persona-workflow-audit-2026-04-18.md`
- `docs/validation/archive/executive-director-persona-findings-2026-04-20.md`
- `docs/validation/archive/executive-director-persona-findings-2026-04-20-remediation.md`

## Cross-Skill Inputs

- `../nonprofit-manager-persona-validation/references/validation-rubric.md`
- `../nonprofit-manager-benchmark-analysis/references/cohort-and-sources.md`
- `../nonprofit-manager-benchmark-analysis/references/persona-pattern-matrix.md`

Use the benchmark skill when external analogs or official-source refreshes matter. Use the validation skill when current repo proof is the question rather than persona framing.
