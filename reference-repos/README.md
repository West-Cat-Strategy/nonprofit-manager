# Reference Repos Workspace

**Last Updated:** 2026-04-25

This directory is the tracked orientation and manifest surface for local-only upstream clones used during benchmark and reference-pattern work.

## Layout

- `external/` holds upstream clones used for product and code-pattern review. The entire tree is ignored.
- `local/` holds scratch mirrors, sparse checkouts, or patched local derivatives. The entire tree is ignored.
- `manifest.lock.json` pins clone sets, remotes, branches, commit hashes, reuse classes, and runtime-note status for active reference waves.

## Reference Waves

- Locked benchmark wave: `P5-T6` OSS benchmark research and reference-pattern synthesis.
- Expansion research wave: `P5-T6-reference-expansion-2026-04`.
- Canonical in-workspace root for both waves: `reference-repos/`.
- Historical docs may still mention `/Users/bryan/projects/reference-repos`; treat that older root as archived context rather than the active workspace convention for this wave.

## Naming And Guardrails

- Clone upstreams under `external/nm--<slug>/`.
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

## Research Docs

- `docs/development/reference-patterns/P5-T6-oss-benchmark/` keeps the locked wave-one OSS nonprofit benchmark findings.
- `docs/development/reference-patterns/P5-T6-reference-expansion-2026-04/` keeps the expanded reference-repo improvement opportunities and verification notes.
