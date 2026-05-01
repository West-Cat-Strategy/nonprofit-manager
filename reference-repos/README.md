# Reference Repos Workspace

**Last Updated:** 2026-05-01

This directory is the tracked orientation and manifest surface for central upstream clones used during benchmark and reference-pattern work. For the contributor-facing routing guide, see [../docs/reference-repos.md](../docs/reference-repos.md).

## Layout

- `external/` holds ignored compatibility symlinks to `/Users/bryan/projects/reference-repos/repos/`.
- `local/` is a legacy ignored scratch location. Do not add new reference clones there; use the central reference workspace instead.
- `manifest.lock.json` pins clone sets, remotes, branches, commit hashes, reuse classes, and runtime-note status for active reference waves.

## Reference Waves

- Locked benchmark wave: `P5-T6` OSS benchmark research and reference-pattern synthesis.
- Expansion research wave: `P5-T6-reference-expansion-2026-04`.
- Newsletter operability wave: `P5-T26-newsletter-reference-refresh`.
- Planning-only finance, governance, and evidence candidate wave: `P5-T35-finance-governance-evidence-reference-refresh`.
- Case-form template builder implementation reference wave: `P5-T41-form-builder-template-refresh`.
- Canonical clone root for all waves: `/Users/bryan/projects/reference-repos/repos/`.
- Compatibility paths remain under `reference-repos/external/` so existing check matrices and source-path notes continue to resolve.

## Naming And Guardrails

- Clone upstreams under `/Users/bryan/projects/reference-repos/repos/<owner>__<repo>/`; expose legacy `external/nm--<slug>/` symlinks only when repo-local docs need stable paths.
- Keep only `README.md` and `manifest.lock.json` tracked under `reference-repos/`; do not track cloned upstream contents.
- Keep companion repos rare and explicit. The current approved companion is `nm--civicrm-docker` because the official local standalone lab for CiviCRM lives there.
- Treat upstream projects as inspiration and comparison inputs, not copy-paste sources. Default to `architecture_only`; use `adapt_with_attribution` only when licensing and attribution are clearly compatible.
- Do not store benchmark clones under `.codex/`, `refs/`, `vendor/`, or `tmp/`.

## Locked `P5-T6` Clone Set

- `nm--civicrm-core`
- `nm--civicrm-docker`
- `nm--openpetra`
- `nm--erpnext`
- `nm--suitecrm`
- `nm--openspp2`
- `nm--sahana-eden`

## `P5-T6-reference-expansion-2026-04` Clone Set

This wave is a research and planning input only. It does not revise the locked `P5-T6` cohort, authorize runtime implementation, or permit direct source copying.

- `nm--primero`
- `nm--commcare-hq`
- `nm--avni-server`
- `nm--avni-webapp`
- `nm--givewp`
- `nm--oca-donation`
- `nm--oca-vertical-association`
- `nm--pretix`
- `nm--opencollective-api`
- `nm--opencollective-frontend`
- `nm--opencrvs-core`
- `nm--mautic`

## `P5-T26-newsletter-reference-refresh` Clone Set

This wave is signed off as newsletter/email operability provenance. It does not reopen `P5-T3` or authorize newsletter automation breadth.

- `nm--sendportal`
- `nm--dittofeed`
- `nm--listmonk`
- `nm--keila`
- `nm--mailtrain`
- `nm--phplist3`
- `nm--email-builder-js`

## `P5-T35-finance-governance-evidence-reference-refresh` Candidate Set

This wave is planning-only. It uses existing central clones to sharpen later finance, governance, and evidence rows; no runtime implementation or direct source copying is authorized.

- `nm--fineract`
- `nm--blnk`
- `nm--ledgersmb`
- `nm--docuseal`

## `P5-T41-form-builder-template-refresh` Clone Set

This wave is implementation support for the case-form template library, autosave, and SMS/email/portal opening workflow. It does not authorize adopting an external form-builder dependency or copying AGPL/commercial source.

- `nm--formera`
- `nm--formio-js`
- `nm--formspec`
- `nm--react-jsonschema-form`
- `nm--opnform`
- `nm--survey-creator`

## Research Docs

- `docs/development/reference-patterns/P5-T6-oss-benchmark/` keeps the locked wave-one OSS nonprofit benchmark findings.
- `docs/development/reference-patterns/P5-T6-reference-expansion-2026-04/` keeps the expanded reference-repo improvement opportunities and verification notes.
- `docs/development/reference-patterns/P5-T6-reference-repo-consolidation-2026-05-01.md` consolidates the May 1 read-only subagent review across communications, finance, service delivery, evidence, and workflow references.
- `docs/development/reference-patterns/P5-T26-newsletter-reference-refresh.md` keeps the newsletter-specific reference refresh.
- `docs/development/reference-patterns/P5-T35-finance-governance-evidence-reference-refresh.md` keeps the finance/governance/evidence planning-only refresh.
- `docs/development/reference-patterns/P5-T41-form-builder-reference-refresh.md` keeps the case-form template-builder reference refresh.
