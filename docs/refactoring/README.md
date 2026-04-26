# Refactoring Notes

**Last Updated:** 2026-04-26

This directory holds durable planning and handoff notes for broad behavior-preserving refactors.
Use the live workboard in [../phases/planning-and-progress.md](../phases/planning-and-progress.md)
for current status and ownership.

## Active Artifacts

- [Modularity, Simplicity, and Reuse Plan - April 2026](MODULARITY_SIMPLICITY_REUSE_PLAN_2026-04.md)
- [Modularity, Simplicity, and Reuse Handoff - April 2026](MODULARITY_SIMPLICITY_REUSE_HANDOFF_2026-04.md)

## Rules

- Preserve public behavior, `/api/v2` route contracts, auth/permission decisions, response envelopes,
  database semantics, route catalogs, root-store shape, and browser URLs.
- Prune code only after current import tracing, docs/config checks, and validation prove the surface is not
  a compatibility contract.
- Keep shared registrars, route catalogs, root store, auth/permission helpers, and final validation
  lead-owned during coordinated work.
