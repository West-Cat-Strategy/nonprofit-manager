# User Interface Template Information

**Last Updated:** 2026-04-19


> Document Type: Canonical UI Constitution
> Version: 2.0.0
> Last Updated: March 6, 2026
> Status: Active

This document is the authoritative design reference for Nonprofit Manager. The old neo-brutalist-first guidance is retired. The application now follows an editorial operations system that prioritizes readability, workflow efficiency, and consistent staff/portal/public navigation.

## Design Direction

The default visual language is editorial operations:

- Neutral workspace surfaces with visible but lighter borders.
- Dark-ink/navy primary actions instead of saturated accent-first blocks.
- Clear typographic hierarchy using `Fraunces` for headings and `Space Grotesk` for working text.
- Dense but scannable tables, filter bars, and cards.
- Shared shell primitives across staff, portal, auth, and public routes.

This system is meant to feel credible and operational rather than playful or ornamental.

## Core Principles

1. Readability first. Headings, labels, row states, and actions must be immediately distinguishable.
2. Workflow over decoration. A user should always know the next safe action from the current page.
3. Shared primitives before bespoke layouts. Use the common shell, page header, section card, state, table, and button components unless a page has a strong product reason not to.
4. Navigation must be canonical. Runtime links and redirects must resolve through the route manifests under `frontend/src/routes/startupRouteCatalog.ts` and feature-owned manifests such as `frontend/src/features/adminOps/adminRouteManifest.ts`.
5. Accessibility is part of the design system, not a QA afterthought.

## Shell Rules

### Staff Shell

- Global navigation is the primary entry point for staff workflows.
- Utility destinations such as analytics, reports, and alerts belong in the staff utility rail.
- Page headers must expose the primary action and should avoid burying high-value tasks below the fold.

### Admin Shell

- Admin side navigation must be driven by the admin feature manifest, including canonical section routes such as `/settings/admin/users`.
- Only show admin-only destinations to admins.
- Section routes are canonical and should not fall back to legacy query aliases.

### Portal Shell

- Portal navigation must use the same token language and shell primitives as staff routes.
- Primary portal destinations should remain stable: dashboard, profile, people, events, messages, cases, appointments, documents, notes, forms, reminders.

### Public/Auth Shell

- Public and auth routes should use the same typography, spacing, focus treatment, and interaction affordances as staff routes.
- Avoid introducing bespoke form treatments that drift from the shared system.

## Component Rules

### Page Header

- Every route-level surface should have one visible H1.
- Expose the main task with a primary action.
- Secondary navigation belongs beside the title or in the side nav, not scattered through the body.

### Section Cards and Lists

- Use `SectionCard` for grouped content.
- Use `DataTable` for row-heavy views.
- Use `LoadingState`, `EmptyState`, and `ErrorState` rather than ad hoc placeholders.

### Tables and Density

- Tables should privilege scanability over decoration.
- Important metadata should be grouped into predictable columns.
- Mobile fallbacks should preserve the same information hierarchy as desktop tables.

### Forms

- Inputs must use semantic token classes (`bg-app-*`, `text-app-*`, `border-app-*`).
- Inline style blocks are disallowed except for dynamic geometry or third-party rendering constraints.
- Brand/color pickers may expose raw values, but preview treatments should still honor system tokens.

## Accessibility Rules

- Skip-link coverage is required for shell layouts.
- Keyboard-only navigation must be supported in staff, portal, and auth flows.
- Focus rings must remain visible in all themes, including high contrast.
- Do not rely on color alone for urgency, state, or success/failure.
- High-contrast mode remains a required acceptance path.

## Route and Audit Guardrails

- `frontend/src/routes/startupRouteCatalog.ts` is the canonical shared manifest for startup, shell, and runtime navigation metadata.
- Feature-specific navigation metadata belongs with the owning feature, for example `frontend/src/features/adminOps/adminRouteManifest.ts`.
- `frontend/src/routes/routeCatalog.ts` remains the audit projection consumed by route-integrity and UI-audit scripts until that tooling is cut over.
- `node scripts/check-route-integrity.ts` validates literal route targets against the catalog.
- `node scripts/check-route-catalog-drift.ts` validates route registration drift.
- `node scripts/ui-audit.ts` tracks semantic-token use and inline-style debt.
- Published audit artifacts live in:
  - `docs/ui/app-ux-audit.md`
  - `docs/ui/app-ux-audit.json`

## Theme and Rollout Rules

- Keep `ThemeId` values stable:
  - `neobrutalist`
  - `sea-breeze`
  - `corporate`
  - `clean-modern`
  - `glass`
  - `high-contrast`
- Theme IDs are compatibility identifiers, not mandates for the visual style their historical names imply.
- Keep `VITE_UI_REDESIGN_ENABLED` stable and evolve token values plus shell primitives instead of forking a second design system.

## Do / Do Not

Do:

- Reuse shared shell primitives.
- Prefer manifest-backed navigation.
- Improve workflow clarity when replacing broken shortcuts or dead-end routes.
- Keep cards, tables, and forms visually consistent across staff and portal experiences.

Do not:

- Reintroduce hard black borders and heavy shadows as the default visual language.
- Add new literal internal routes that bypass the route manifests.
- Use inline styles for ordinary spacing, colors, or text wrapping.
- Ship route surfaces without H1, primary action, and empty/error/loading treatment.
