# User Interface Template Information

**Last Updated:** 2026-06-05


> Document Type: Canonical UI Constitution
> Version: 2.1.0
> Last Updated: June 5, 2026
> Status: Active

This document is the authoritative design reference for Nonprofit Manager. The old neo-brutalist-first guidance is retired. The application now follows an editorial operations system that prioritizes readability, workflow efficiency, and consistent staff/portal/public navigation.

Start with [README.md](README.md) for the active UI-doc map and [archive/README.md](archive/README.md) for dated audit snapshots and review notes.

## Design Direction

The default visual language is Calm Ops:

- Neutral workspace surfaces with subtle borders, compact spacing, and shallow shadows.
- Restrained teal, indigo, and green accents for primary actions, selection, and semantic status.
- Clear typographic hierarchy using `Public Sans` for working UI and `Manrope` for display or page-level headings.
- Dense but scannable tables, filter bars, action rails, cards, and forms.
- Shared shell primitives across staff, portal, auth, public, and demo/test route-QA surfaces.

This system is meant to feel credible and operational rather than playful or ornamental.

## Core Principles

1. Readability first. Headings, labels, row states, and actions must be immediately distinguishable.
2. Workflow over decoration. A user should always know the next safe action from the current page.
3. Shared primitives before bespoke layouts. Use the common shell, side navigation, page header, section card, metric strip, toolbar row, status pill, state, table, form, and button components unless a page has a strong product reason not to.
4. Navigation must be canonical. Runtime links and redirects must resolve through the route manifests under `frontend/src/routes/startupRouteCatalog.ts` and feature-owned manifests such as `frontend/src/features/adminOps/adminRouteManifest.ts`.
5. Accessibility is part of the design system, not a QA afterthought.

## Shell Rules

### Staff Shell

- The staff top bar carries workspace identity, search, alerts, theme, and account controls.
- The staff side rail is the primary entry point for route-family navigation.
- Utility destinations such as analytics, reports, and alerts belong in the staff navigation model rather than one-off page shortcuts.
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
- Use `MetricStrip`, `ToolbarRow`, and `StatusPill` for dashboard metrics, filters, and state labels before introducing page-local variants.
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
- Published audit artifacts now live in:
  - `docs/ui/archive/app-ux-audit.md`
  - `docs/ui/archive/app-ux-audit.json`

## Theme and Rollout Rules

- Keep `ThemeId` values stable:
  - `neobrutalist`
  - `sea-breeze`
  - `corporate`
  - `clean-modern`
  - `glass`
  - `high-contrast`
- Theme IDs are compatibility identifiers, not mandates for the visual style their historical names imply.
- Evolve token values plus shell primitives instead of forking a second design system.

## Do / Do Not

Do:

- Reuse shared shell primitives.
- Prefer manifest-backed navigation.
- Improve workflow clarity when replacing broken shortcuts or dead-end routes.
- Keep cards, tables, and forms visually consistent across staff and portal experiences.
- Preserve route paths, permission behavior, `/api/v2` contracts, and response envelopes during UI-only migrations.

Do not:

- Reintroduce hard black borders and heavy shadows as the default visual language.
- Add new literal internal routes that bypass the route manifests.
- Use inline styles for ordinary spacing, colors, or text wrapping.
- Ship route surfaces without H1, primary action, and empty/error/loading treatment.
- Add a new UI framework or icon dependency for presentation-only refreshes.
