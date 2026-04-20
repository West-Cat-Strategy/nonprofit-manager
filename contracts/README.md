# Contracts Package

**Last Updated:** 2026-04-20

This directory contains the shared type-only package published inside the monorepo as `@nonprofit-manager/contracts`.

Use it for small, stable contracts that both frontend and backend need without importing each other's application source trees.

## Current Exports

- [package.json](package.json) defines the package name and exported entrypoints.
- [index.d.ts](index.d.ts) re-exports the public type surface.
- [messaging.d.ts](messaging.d.ts) contains shared messaging types.
- [websiteBuilder.d.ts](websiteBuilder.d.ts) contains the canonical website-builder and site-theme types.

## Maintenance Notes

- Keep this package type-only. Do not add runtime code here.
- Add contracts here only when the same shape is intentionally shared across app boundaries.
- When you add a new declaration file, update [package.json](package.json) exports and [index.d.ts](index.d.ts) if the new types should be publicly reachable.
