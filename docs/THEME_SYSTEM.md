# Theme System Documentation

**Last Updated:** 2026-04-20

Use this doc when you are changing theme tokens, selector metadata, or shared shell presentation. Start with [ui/README.md](ui/README.md) for the active UI-doc map and [ui/archive/README.md](ui/archive/README.md) for dated audit evidence. For frontend runtime ownership, use [../frontend/README.md](../frontend/README.md).

## Overview

The app supports 6 stable theme IDs with light/dark mode handling and a feature-flagged redesign layer.

| Theme ID | Label | Short Label | Personality |
| --- | --- | --- |
| `neobrutalist` | Editorial Ops | `EO` | Warm editorial workspace with paper-toned surfaces and ink-first hierarchy |
| `sea-breeze` | Sea Breeze | `SB` | Rounded marine palette for calmer intake and portal-heavy flows |
| `corporate` | Corporate | `CP` | Crisp enterprise presentation with tighter geometry and restrained chrome |
| `clean-modern` | Clean Modern | `CM` | Sage-forward modern workspace with softer depth and quieter structure |
| `glass` | Glass | `GL` | Frosted, luminous panels with neon-accented night mode |
| `high-contrast` | High Contrast | `HC` | Accessibility-first mode with zero blur and maximum focus clarity |

Theme IDs are compatibility contracts. Their names should remain stable even when token values evolve.

## Current Design Model

The redesign does not create a parallel theme system. It keeps the existing engine and changes token values, preview metadata, and shared shell overrides:

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
- Shell: `--app-shell-surface`, `--app-shell-top`, `--app-shell-glow`, `--app-shell-glow-secondary`

The default editorial palette is intentionally calmer than the historical neo-brutalist defaults:

- Neutral off-white backgrounds
- Dark ink primary text
- Navy primary actions
- Lighter borders and softer elevation

Each non-default theme now owns both:

- a distinct light-mode token set,
- a distinct dark-mode token set,
- and its own typography, radius, elevation, and shell-atmosphere treatment.

Dark mode is no longer a single flattened redesign palette shared across every theme.

## Shared UI Tokens

The redesign layer also standardizes shared UI values:

- `--ui-font-display`
- `--ui-font-body`
- `--ui-radius-*`
- `--ui-elev-*`
- `--ui-motion-*`

These tokens are used by shared shell primitives and should be preferred over hard-coded one-off values. Theme-specific personality changes should happen here before adding component-level overrides.

## Selector and Menu Metadata

`frontend/src/theme/themeRegistry.ts` is the source of truth for:

- stable theme IDs,
- human-facing labels,
- short labels used by compact navigation controls,
- selector and menu descriptions,
- preview color metadata.

Theme selection UI should use CSS classes or `data-theme` hooks for previews rather than inline styles so it stays within the UI-audit policy.

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

Archived UX audit artifacts:

- `docs/ui/archive/app-ux-audit.md`
- `docs/ui/archive/app-ux-audit.json`

Treat those artifacts as evidence snapshots, not as the source of truth for current theme tokens.

## Migration Rules

1. Keep theme IDs, persistence keys, and rollout flags stable.
2. Prefer semantic token classes over raw Tailwind palette utilities.
3. Use the shared shell/components before inventing new route-level wrappers.
4. Do not add new inline style blocks unless the value is dynamic geometry or a third-party rendering constraint.
5. Update the audit artifacts when route availability, navigation, or major workflow UX changes.
