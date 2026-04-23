# Reference Repos Workspace

**Last Updated:** 2026-04-22

This directory is the tracked orientation and manifest surface for local-only upstream clones used during benchmark and reference-pattern work.

## Layout

- `external/` holds upstream clones used for product and code-pattern review. The entire tree is ignored.
- `local/` holds scratch mirrors, sparse checkouts, or patched local derivatives. The entire tree is ignored.
- `manifest.lock.json` pins the current clone set, remotes, branches, commit hashes, and runtime-note status for the active wave.

## Current Wave

- Active benchmark wave: `P5-T6` OSS benchmark research and reference-pattern synthesis.
- Canonical in-workspace root for this wave: `reference-repos/`.
- Historical docs may still mention `/Users/bryan/projects/reference-repos`; treat that older root as archived context rather than the active workspace convention for this wave.

## Naming And Guardrails

- Clone upstreams under `external/nm--<slug>/`.
- Keep only `README.md` and `manifest.lock.json` tracked under `reference-repos/`; do not track cloned upstream contents.
- Keep companion repos rare and explicit. The current approved companion is `nm--civicrm-docker` because the official local standalone lab for CiviCRM lives there.
- Treat upstream projects as inspiration and comparison inputs, not copy-paste sources. Default to `architecture_only`; use `adapt_with_attribution` only when licensing and attribution are clearly compatible.
- Do not store benchmark clones under `.codex/`, `refs/`, `vendor/`, or `tmp/`.

## Current Clone Set

- `nm--civicrm-core`
- `nm--civicrm-docker`
- `nm--openpetra`
- `nm--erpnext`
- `nm--suitecrm`
- `nm--openspp2`
- `nm--sahana-eden`
