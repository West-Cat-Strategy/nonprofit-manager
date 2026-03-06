# Theme System Documentation

## Overview

The app supports 6 stable theme IDs with light/dark mode handling and a feature-flagged redesign layer.

| Theme ID | Display Label | Current Role |
| --- | --- | --- |
| `neobrutalist` | Editorial Ops | Default editorial workspace theme |
| `sea-breeze` | Sea Breeze | Calm service-delivery palette |
| `corporate` | Corporate | Restrained enterprise presentation |
| `clean-modern` | Clean Modern | Soft structure, lower visual noise |
| `glass` | Glass | Translucent panels with cooler ink contrast |
| `high-contrast` | High Contrast | WCAG-first visibility and interaction affordance |

Theme IDs are compatibility contracts. Their names should remain stable even when token values evolve.

## Current Design Model

The redesign does not create a parallel theme system. It keeps the existing engine and changes the token values plus shared shell overrides:

- `frontend/src/theme/themeRegistry.ts` owns theme metadata and previews.
- `frontend/src/index.css` owns token values and the `body.ui-redesign` presentation layer.
- `VITE_UI_REDESIGN_ENABLED` controls rollout.

## Token Layer

The active semantic tokens are:

- Surface: `--app-bg`, `--app-surface`, `--app-surface-muted`, `--app-surface-elevated`
- Text: `--app-text`, `--app-text-muted`, `--app-text-subtle`, `--app-text-heading`, `--app-text-label`
- Borders: `--app-border`, `--app-border-muted`, `--app-input-border`
- Actions: `--app-accent`, `--app-accent-hover`, `--app-accent-foreground`, `--app-accent-text`, `--app-accent-text-hover`, `--app-accent-soft`, `--app-accent-soft-hover`
- Interaction: `--app-hover`, `--focus-ring`

The default editorial palette is intentionally calmer than the historical neo-brutalist defaults:

- Neutral off-white backgrounds
- Dark ink primary text
- Navy primary actions
- Lighter borders and softer elevation

## Shared UI Tokens

The redesign layer also standardizes shared UI values:

- `--ui-font-display`
- `--ui-font-body`
- `--ui-radius-*`
- `--ui-elev-*`
- `--ui-motion-*`

These tokens are used by shared shell primitives and should be preferred over hard-coded one-off values.

## Accessibility Requirements

- High-contrast mode is a first-class theme and must stay functional.
- Focus rings must remain visible across all themes.
- Theme changes cannot remove semantic differences between surfaces, actions, and muted content.

## Audit and Enforcement

Use these commands when changing theming, shared primitives, or route-level UI:

```bash
node scripts/ui-audit.ts
node scripts/check-route-integrity.ts
node scripts/check-route-catalog-drift.ts
```

Published UX audit artifacts:

- `docs/ui/app-ux-audit.md`
- `docs/ui/app-ux-audit.json`

## Migration Rules

1. Keep theme IDs, persistence keys, and rollout flags stable.
2. Prefer semantic token classes over raw Tailwind palette utilities.
3. Use the shared shell/components before inventing new route-level wrappers.
4. Do not add new inline style blocks unless the value is dynamic geometry or a third-party rendering constraint.
5. Update the audit artifacts when route availability, navigation, or major workflow UX changes.
