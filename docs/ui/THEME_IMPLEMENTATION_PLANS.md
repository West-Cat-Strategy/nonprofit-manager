# Theme Implementation Plans

This document outlines the step-by-step plan to implement three new UI themes for the Nonprofit Manager application: **Sea Breeze**, **Corporate Minimalist**, and **Dark Glassmorphism**.

## Prerequisites: Theme Engine Refactor

Before implementing specific themes, the application must be refactored to support dynamic theming beyond a simple light/dark toggle.

### 1. Refactor `frontend/tailwind.config.js`
**Goal:** Decouple hardcoded hex values and point them to CSS variables.

**Action:** Update the `colors.loop` object to use CSS variables.
```javascript
// frontend/tailwind.config.js
export default {
    // ...
    theme: {
        extend: {
            colors: {
                loop: {
                    yellow: 'var(--loop-yellow)',
                    green: 'var(--loop-green)',
                    purple: 'var(--loop-purple)',
                    pink: 'var(--loop-pink)',
                    cyan: 'var(--loop-cyan)',
                    blue: 'var(--loop-blue)',
                },
                app: {
                    bg: 'var(--app-bg)',
                    surface: 'var(--app-surface)',
                    text: 'var(--app-text)',
                    border: 'var(--app-border)',
                }
            },
            // ...
        }
    }
}
```

### 2. Refactor `frontend/src/contexts/ThemeContext.tsx`
**Goal:** Expand state to support multiple theme strings.

**Action:**
- Change `isDarkMode` (boolean) to `currentTheme` (string).
- Supported values: `'default' | 'sea-breeze' | 'corporate' | 'glass'`.
- **Migration Safety:** In `useEffect`, explicitly `classList.remove('neo-dark-mode')` to ensure no conflict with legacy styles.
- Update `useEffect` to remove all previous theme classes and add the current one.
- **Expose:** `theme`, `setTheme(theme: string)`, `availableThemes` array.

### 3. Create `ThemeSelector` Component
**Goal:** Create a reusable component for theme switching.
**File:** `frontend/src/components/ThemeSelector.tsx`

**Specs:**
- Render a row of buttons or cards for each theme.
- "Sea Breeze": Light teal button.
- "Corporate": Gray/White clean button.
- "Glass": Dark/Azure button.
- "Default": Neo-Brutalist Yellow button.
- **Accessibility Requirements:**
    - Use semantic `<button>` elements.
    - `aria-label`: "Select Sea Breeze Theme", etc.
    - `aria-pressed`: true/false based on active state.
    - Visible focus rings (`focus-visible`) that match the active theme's border color.
    - Support Arrow Key navigation if implemented as a toolbar, or Tab navigation if list of buttons.

### 4. Integrate into `UserSettings` Page
**Goal:** Allow users to switch themes from the settings page seamlessly.

**Action:**
- **Remove:** The old "Dark Mode" card at the bottom of `frontend/src/pages/UserSettings.tsx`.
- **Insert:** The new `ThemeSelector` component at the **TOP** of the settings container (just below the "Top Actions Pane").

### 5. Refactor `frontend/src/App.tsx`
**Goal:** Remove hardcoded layout classes.

**Action:**
- Replace `bg-gray-50` with `bg-app-bg text-app-text`.

---

## Theme 1: Sea Breeze
**Concept:** A refreshing, light, and airy theme. Soft rounded corners, teal/turquoise palette, and gentle shadows.

### Implementation Steps

1.  **CSS Variables (`frontend/src/index.css`)**
    Add the following selector:
    ```css
    body.theme-sea-breeze {
      /* Palette */
      --loop-yellow: #FED8B1; /* Light Sunset Orange */
      --loop-green: #98FB98;  /* Pale Green */
      --loop-purple: #E6E6FA; /* Lavender */
      --loop-pink: #FFB6C1;   /* Light Pink */
      --loop-cyan: #AFEEEE;   /* Pale Turquoise */
      --loop-blue: #87CEFA;   /* Light Sky Blue */

      /* App Base */
      --app-bg: #E0F7FA;      /* Very Light Cyan */
      --app-surface: #FFFFFF;
      --app-text: #006064;    /* Dark Cyan Text */
      --app-border: #4DD0E1;

      /* Brutalist Overrides (Softened) */
      --shadow-color: rgba(32, 178, 170, 0.4); /* Semi-transparent Teal */
      --border-brutal: 2px solid #20B2AA;      /* Light Sea Green Border */
      --shadow-brutal: 4px 4px 10px var(--shadow-color); /* Soft Blur Shadow */
      --shadow-brutal-sm: 2px 2px 5px var(--shadow-color);
      --font-weight-brutal: 600; /* Lighter font weight */
    }
    ```

2.  **Global Overrides**
    ```css
    body.theme-sea-breeze .border-brutal {
        border-radius: 16px !important; /* Soft corners */
    }
    body.theme-sea-breeze button,
    body.theme-sea-breeze .btn {
        border-radius: 50px !important; /* Pill shapes for buttons */
    }
    ```

---

## Theme 2: Corporate Minimalist
**Concept:** Function over form. Clean, professional, "boring". High legibility, subtle borders, no brutalist hard shadows.

### Implementation Steps

1.  **CSS Variables (`frontend/src/index.css`)**
    Add the following selector:
    ```css
    body.theme-corporate {
      /* Palette - Muted & Professional */
      --loop-yellow: #EAB308; /* Yellow-500 */
      --loop-green: #22C55E;  /* Green-500 */
      --loop-purple: #6366F1; /* Indigo-500 */
      --loop-pink: #EC4899;   /* Pink-500 */
      --loop-cyan: #06B6D4;   /* Cyan-500 */
      --loop-blue: #3B82F6;   /* Blue-500 */

      /* App Base */
      --app-bg: #F3F4F6;      /* Gray 100 */
      --app-surface: #FFFFFF;
      --app-text: #111827;    /* Gray 900 */
      --app-border: #D1D5DB;  /* Gray 300 */

      /* Brutalist Overrides (Normalized) */
      --shadow-color: rgba(0, 0, 0, 0.05);
      --border-brutal: 1px solid #E5E7EB; /* Thin Gray Border */
      --shadow-brutal: 0 1px 2px 0 var(--shadow-color); /* Subtle standard shadow */
      --shadow-brutal-sm: 0 1px 2px 0 var(--shadow-color);
      --font-weight-brutal: 500; /* Normal weight */
    }
    ```

2.  **Global Overrides**
    ```css
    body.theme-corporate * {
        text-transform: none !important; /* Remove any brutalist caps */
        letter-spacing: normal !important;
    }
    body.theme-corporate .border-brutal {
        border-radius: 6px !important; /* Standard small radius */
    }
    ```

---

## Theme 3: Dark Glassmorphism (Azure Glow)
**Concept:** Futuristic, dark, and glowing. Uses backdrop filters, semi-transparent surfaces, and neon azure accents.

### Implementation Steps

1.  **CSS Variables (`frontend/src/index.css`)**
    Add the following selector:
    ```css
    body.theme-glass {
      /* Palette - Neon/Digital */
      --loop-yellow: #FFD700;
      --loop-green: #00FF9D;
      --loop-purple: #B026FF;
      --loop-pink: #FF007F;
      --loop-cyan: #00FFFF;
      --loop-blue: #007FFF;   /* Azure Blue */

      /* App Base */
      --app-bg: #050510;      /* Deep Void Blue/Black */
      --app-surface: rgba(255, 255, 255, 0.05); /* Glassy Surface */
      --app-text: #E0E7FF;    /* Indigo-100 */
      --app-border: rgba(0, 127, 255, 0.3); /* Low opacity Azure */

      /* Brutalist Overrides (Glowing) */
      --shadow-color: #007FFF; /* Azure Blue Glow */
      --border-brutal: 1px solid rgba(255, 255, 255, 0.1);
      --shadow-brutal: 0 0 15px rgba(0, 127, 255, 0.4);
      --shadow-brutal-sm: 0 0 10px rgba(0, 127, 255, 0.4);
    }
    ```

2.  **Global Overrides**
    ```css
    body.theme-glass .bg-white, 
    body.theme-glass .bg-gray-50 {
        background-color: var(--app-surface) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
    }

    /* Glow Effects on Hover */
    body.theme-glass div[class*="border-brutal"]:hover {
        box-shadow: 0 0 25px var(--shadow-color) !important;
        border-color: var(--loop-blue) !important;
    }

    body.theme-glass .border-brutal {
        border-radius: 16px !important;
    }
    ```

## Verification Plan

1.  **Unit Tests**: N/A (Visual changes primarily)
2.  **Manual Verification**:
    -   Go to **Settings** page.
    -   Locate the new **Theme Selector** at the top.
    -   **Click "Sea Breeze"**: Verify UI transforms to rounded corners, light teal background, and soft shadows.
    -   **Click "Corporate"**: Verify UI transforms to standard gray/white, square corners, and subtle borders.
    -   **Click "Glass"**: Verify UI transforms to dark void background, glowing blue borders, and backdrop blurs.
    -   **Click "Default"**: Verify UI returns to standard Neo-Brutalist (yellow/black).
    -   Refresh the page to verify theme persistence (via `localStorage` in `ThemeContext`).
3.  **Accessibility Verification**:
    -   **Keyboard Nav**: Use `Tab` to navigate to the Theme Selector. Ensure complete focus visibility.
    -   **Screen Reader (Simulated)**: Inspect that buttons have `aria-label` and `aria-pressed` attributes.
    -   **Contrast Check**: Verify that text in "Glass" mode maintains >= 4.5:1 contrast ratio.
