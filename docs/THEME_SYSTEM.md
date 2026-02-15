# Theme System Documentation

## Overview

The app supports 6 visual themes with light/dark mode and system preference detection:

| Theme | Description |
|-------|-------------|
| **Neobrutalist** (default) | Bold borders, vibrant LOOP brand colors, playful shadows |
| **Sea Breeze** | Cool blues and teals, calming ocean palette |
| **Corporate** | System UI fonts, muted grays, professional feel |
| **Clean Modern** | Minimal design, subtle borders, clean whitespace |
| **Glass** | Frosted glass effects, transparency, backdrop blur |
| **High-Contrast** | WCAG AAA (7:1+), no rounded corners, 3px borders, zero shadows |

## Architecture

### CSS Variable Layer (`index.css`)

Every theme defines CSS custom properties on `body.theme-<name>`:

```css
body.theme-sea-breeze {
  --app-bg: #EFF6FF;
  --app-surface: #FFFFFF;
  --app-text: #1E3A5F;
  --app-border: #93C5FD;
  --app-accent: #2563EB;
  /* ... 17 more tokens */
}
```

Dark mode overrides use `.dark.theme-<name>` selectors.

### Semantic Tokens (21 total)

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `app-bg` | `--app-bg` | Page background |
| `app-surface` | `--app-surface` | Card/panel background |
| `app-surface-muted` | `--app-surface-muted` | Subdued surface (table headers, inactive rows) |
| `app-surface-elevated` | `--app-surface-elevated` | Elevated panels (dropdowns, modals) |
| `app-text` | `--app-text` | Primary body text |
| `app-text-muted` | `--app-text-muted` | Secondary text |
| `app-text-subtle` | `--app-text-subtle` | Tertiary/hint text |
| `app-text-heading` | `--app-text-heading` | Headings |
| `app-text-label` | `--app-text-label` | Form labels |
| `app-border` | `--app-border` | Standard borders |
| `app-border-muted` | `--app-border-muted` | Subtle dividers |
| `app-accent` | `--app-accent` | Primary action color |
| `app-accent-hover` | `--app-accent-hover` | Accent hover state |
| `app-accent-text` | `--app-accent-text` | Text on accent bg |
| `app-accent-text-hover` | `--app-accent-text-hover` | Active link text |
| `app-accent-soft` | `--app-accent-soft` | Light accent bg (badges, active states) |
| `app-accent-soft-hover` | `--app-accent-soft-hover` | Hover for soft accent |
| `app-hover` | `--app-hover` | General hover background |
| `app-input-bg` | `--app-input-bg` | Form input background |
| `app-input-border` | `--app-input-border` | Form input border |

### Tailwind Config (`tailwind.config.js`)

Maps CSS variables to Tailwind utilities:

```js
colors: {
  app: {
    bg: 'var(--app-bg)',
    surface: 'var(--app-surface)',
    text: 'var(--app-text)',
    // ... all 21 tokens
  }
}
```

Usage: `bg-app-surface`, `text-app-text-muted`, `border-app-border`, etc.

### ThemeContext (`contexts/ThemeContext.tsx`)

React context providing:
- `theme` / `setTheme` — Current theme name
- `isDarkMode` — Computed dark mode state
- `colorScheme` / `setColorScheme` — User preference: `'light' | 'dark' | 'system'`
- `availableThemes` — Array of theme names

Features:
- **System preference detection**: Listens to `prefers-color-scheme: dark` media query
- **Smooth transitions**: Adds `.theme-transitioning` class during theme switches (300ms CSS transitions)
- **Persistence**: `localStorage` keys: `app-theme`, `app-color-scheme`

### ThemeSelector (`components/ThemeSelector.tsx`)

Full-featured theme picker with:
- Miniature UI preview cards showing each theme's actual colors
- 3-state color scheme toggle (Light / Dark / System) with Sun/Moon/Desktop icons
- Full ARIA: `role="radiogroup"`, `role="radio"`, keyboard navigation, live announcements
- Currently placed at top of User Settings page and as a quick-access popover in Navigation bar

## Migration Guide: Hardcoded Colors → Semantic Tokens

### Common Replacements

| Hardcoded | Semantic Token | Usage |
|-----------|---------------|-------|
| `bg-white` | `bg-app-surface` | Card/panel backgrounds |
| `bg-gray-50` | `bg-app-surface-muted` | Table headers, inactive rows |
| `bg-gray-100` | `bg-app-bg` | Page background |
| `text-gray-900` | `text-app-text` or `text-app-text-heading` | Primary text / headings |
| `text-gray-700` | `text-app-text-muted` | Labels, secondary text |
| `text-gray-500` | `text-app-text-muted` | Descriptions, metadata |
| `text-gray-400` | `text-app-text-subtle` | Placeholder, hints |
| `border-gray-200` | `border-app-border` | Standard borders |
| `border-gray-300` | `border-app-input-border` | Form input borders |
| `divide-gray-200` | `divide-app-border` | Table/list dividers |
| `hover:bg-gray-100` | `hover:bg-app-hover` | Hover backgrounds |
| `hover:bg-gray-50` | `hover:bg-app-hover` | Subtle hover backgrounds |
| `bg-blue-600` | `bg-app-accent` | Primary buttons |
| `hover:bg-blue-700` | `hover:bg-app-accent-hover` | Primary button hover |
| `text-blue-600` | `text-app-accent` | Links, active text |
| `bg-blue-50 text-blue-700` | `bg-app-accent-soft text-app-accent-text` | Active states, badges |
| `focus:ring-blue-500` | `focus:ring-app-accent` | Focus rings |

### What NOT to Migrate

Keep hardcoded colors for:
- **Status badges**: `bg-green-100 text-green-800` (active), `bg-red-100 text-red-800` (error)
- **Semantic alerts**: `text-red-600` (destructive actions), `text-yellow-600` (warnings)
- **Brand colors**: Logo gradients (`from-blue-600 to-indigo-700`)
- **Login/auth pages**: These render before user theme is loaded

### Form Input Pattern

```tsx
// Before
<input className="border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />

// After
<input className="border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:ring-2 focus:ring-app-accent" />
```

### Modal Pattern

```tsx
// Before
<div className="bg-white rounded-lg shadow-xl">
  <h3 className="text-gray-900">Title</h3>
  <label className="text-gray-700">Label</label>
  <button className="text-gray-700 hover:bg-gray-100">Cancel</button>
  <button className="bg-blue-600 hover:bg-blue-700">Submit</button>
</div>

// After
<div className="bg-app-surface rounded-lg shadow-xl">
  <h3 className="text-app-text-heading">Title</h3>
  <label className="text-app-text-label">Label</label>
  <button className="text-app-text-muted hover:bg-app-hover">Cancel</button>
  <button className="bg-app-accent hover:bg-app-accent-hover">Submit</button>
</div>
```

### Table Pattern

```tsx
// Before
<div className="bg-white border border-gray-200">
  <thead className="bg-gray-50">
    <th className="text-gray-500">Header</th>
  </thead>
  <tbody className="divide-y divide-gray-200">
    <td className="text-gray-900">Content</td>
  </tbody>
</div>

// After  
<div className="bg-app-surface border border-app-border">
  <thead className="bg-app-surface-muted">
    <th className="text-app-text-muted">Header</th>
  </thead>
  <tbody className="divide-y divide-app-border">
    <td className="text-app-text">Content</td>
  </tbody>
</div>
```

## Migration Progress

### Fully Migrated (Semantic Tokens)
- `Layout.tsx`, `MainLayout.tsx`, `Navigation.tsx`
- `UserManagement.tsx`, `Dashboard.tsx`, `PortalDashboard.tsx`
- `ThemeSelector.tsx`, `ThemeContext.tsx`, `NeoBrutalistLayout.tsx`
- All main page wrappers and admin settings sections.

### Substantially Migrated (>90%)
- Core modules: `People`, `Finance`, `Tasks`, `Wiki`, `Events`.
- Most forms and list views now use semantic tokens for backgrounds, borders, and text colors.

### Remaining
Small utility components and legacy widgets in `frontend/src/components/` that are scheduled for refactoring in Phase 4.

## Adding a New Theme

1. Add CSS variables to `index.css`:
   ```css
   body.theme-your-theme {
     --app-bg: #...;
     --app-surface: #...;
     /* all 21 tokens */
   }
   .dark.theme-your-theme {
     /* dark mode overrides */
   }
   ```

2. Add theme name to `availableThemes` array in `ThemeContext.tsx`

3. Add preview colors to `themeColors` map in `ThemeSelector.tsx`

4. (Optional) Add theme-specific CSS overrides below the variable block
