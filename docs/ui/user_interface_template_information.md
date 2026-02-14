# 📐 User Interface Template Information

> **Document Type:** Design System Constitution  
> **Version:** 1.0.0  
> **Last Updated:** 2026-02-03  
> **Status:** FROZEN - Canonical Reference

This document serves as the authoritative reference for the Nonprofit Manager UI design system. Any AI agent or developer working on this project MUST adhere to these specifications to maintain visual and functional consistency.

---

## 1. Design Philosophy & History

### Core Style: Neo-Brutalism

The Nonprofit Manager application employs a **Neo-Brutalist** design language characterized by:

- **Thick, unapologetic borders** (2px minimum)
- **High saturation accent colors** (no pastels on primary elements)
- **Hard geometric shadows** (no blur, no gradients)
- **Bold typography** (Black/Heavy weights for headers)
- **Raw, honest aesthetics** (form follows function)

This style was chosen to convey **strength, reliability, and clarity** - essential qualities for nonprofit organizations managing critical community data.

### The "LOOP" Logic

The application is organized around four core modules, forming the **LOOP** acronym:

| Letter | Module | Purpose | Primary Color |
|--------|--------|---------|---------------|
| **L** | Linking | Partnership & Organization Management | Green |
| **O** | Operations | Task Board & Workflow Management | Blue |
| **O** | Outreach | Campaign & Communication Management | Purple |
| **P** | People | Contact Directory & Volunteer Management | Pink |

The **Dashboard** serves as the entry point, branded with the signature **Yellow/Gold** color.

### The "Contrast Collapse" Problem

During dark mode implementation, we encountered a critical issue dubbed **"Contrast Collapse"**:

> **Problem:** Black borders (`border-black`) became invisible against dark backgrounds (`bg-[#121212]`), causing the entire Neo-Brutalist visual identity to disappear.

> **Failed Approach:** Simply inverting all colors created a secondary issue where black text on bright colored cards became white, making the "Safety Zone" cards unreadable.

### The Solution: "Chalkboard Protocol"

We developed the **Chalkboard Protocol** - named after the visual metaphor of white chalk on a black chalkboard. This protocol establishes:

1. **Dark backgrounds** use white/cream borders and text
2. **Bright colored cards** (the "Safety Zones") retain their black text and borders
3. **Inputs** receive isolated dark grey backgrounds to prevent "vanishing input" syndrome

---

## 2. The "LOOP" Color System

### Exact Hex Specifications

All modules use specific hex colors that MUST NOT be altered without updating this document:

```
┌─────────────────────────────────────────────────────────────────┐
│  MODULE          │  HEX CODE    │  NAME         │  TEXT COLOR  │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard Hero  │  #FFD700     │  Gold         │  #000000     │
│  Linking (L)     │  #90EE90     │  Light Green  │  #000000     │
│  Operations (O)  │  #87CEEB     │  Sky Blue     │  #000000     │
│  Outreach (O)    │  #D8BFD8     │  Thistle      │  #000000     │
│  People (P)      │  #FFB6C1     │  Light Pink   │  #000000     │
└─────────────────────────────────────────────────────────────────┘
```

### CSS Variable Mapping

These colors are exposed as CSS custom properties in `index.css`:

```css
:root {
  --loop-yellow: #FFD700;  /* Dashboard / Brand */
  --loop-green: #90EE90;   /* Linking */
  --loop-blue: #87CEEB;    /* Operations */
  --loop-purple: #D8BFD8;  /* Outreach */
  --loop-pink: #FFB6C1;    /* People */
  --loop-cyan: #E0FFFF;    /* Accent / Secondary */
}
```

### Critical Rule: Text on Colored Cards

> ⚠️ **NEVER** use white text on LOOP colors.  
> These bright pastels require **BLACK** (`#000000`) text for WCAG AA compliance.

---

## 3. The Theme Engine Specs

The application supports 4 distinct themes, all maintaining the Neo-Brutalist structure:

### Theme 1: Neo-Brutalist (Default)

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` (Pure White) |
| Surface | `#F5F5F5` (Light Grey) |
| Text | `#000000` (Pure Black) |
| Border | `#000000` (Pure Black) |
| Shadow | `6px 6px 0px 0px #000000` |

**Dark Mode Variant:**
| Property | Value |
|----------|-------|
| Background | `#121212` (Near Black) |
| Surface | `#1A1A1A` (Charcoal) |
| Text | `#FFFFFF` (Pure White) |
| Border | `#FFFFFF` (Pure White) |
| Shadow | `6px 6px 0px 0px #FFFFFF` |

### Theme 2: Sea Breeze

| Property | Value |
|----------|-------|
| Background | `#E0F7FA` (Light Cyan) |
| Surface | `#B2EBF2` (Pale Cyan) |
| Text | `#006064` (Dark Teal) |
| Border | `#00838F` (Teal) |
| Shadow | `6px 6px 0px 0px #0077BE` |
| LOOP Colors | Remapped to Teal palette (Light variants) |

**Character:** Calm, professional, healthcare-adjacent.

### Theme 3: Corporate Minimal

| Property | Value |
|----------|-------|
| Background | `#FFFFFF` (White) |
| Surface | `#F9FAFB` (Grey 50) |
| Text | `#111827` (Grey 900) |
| Border | `#000000` (Black) |
| Shadow | `6px 6px 0px 0px #9CA3AF` (Grey 400) |
| LOOP Colors | **DISABLED** - All cards are grayscale |

**Dark Mode:**
| Property | Value |
|----------|-------|
| Background | `#111827` (Grey 900) |
| Surface | `#1F2937` (Grey 800) |
| Text | `#F9FAFB` (Grey 50) |
| LOOP Colors | Light grey variants (`#E5E7EB`) |

**Character:** Strictly monochrome. No colored shadows. Enterprise-grade.

### Theme 4: Glassmorphism

| Property | Value |
|----------|-------|
| Background | `#94A3B8` (Slate 400 - Dark Silver-Blue) |
| Surface | `rgba(255, 255, 255, 0.1)` with `backdrop-blur-md` |
| Text | `#FFFFFF` (White) |
| Border | `rgba(255, 255, 255, 0.2)` |
| Shadow | `0 8px 32px rgba(0, 0, 0, 0.1)` |
| Card Effect | Frosted glass (`backdrop-filter: blur(12px)`) |

**Dark Mode:**
| Property | Value |
|----------|-------|
| Background | `#1E293B` (Slate 800) |
| Surface | `rgba(255, 255, 255, 0.05)` with `backdrop-blur-lg` |
| LOOP Colors | Bright neons (Cyan `#00FFFF`, etc.) |

**Character:** Modern, tech-forward, ambient depth.

---

## 4. The "Chalkboard Protocol" (Dark Mode Rules)

This section defines the **immutable laws** of dark mode styling. Violations will cause "Contrast Collapse."

### Rule 1: Global Inversion

All elements on dark backgrounds must invert their contrast:

```css
/* BORDERS */
.dark .border-black {
  border-color: #FFFFFF !important;
}

/* TEXT */
.dark body,
.dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6,
.dark p, .dark span, .dark label, .dark div,
.dark td, .dark th, .dark li, .dark a {
  color: #FFFFFF;
}
```

### Rule 2: The Safety Zones (CRITICAL)

Elements with LOOP color backgrounds are **exempt** from Rule 1. They MUST retain black text:

```css
/* Safety Zone Declaration */
.dark .bg-[var(--loop-yellow)] *,
.dark .bg-[var(--loop-green)] *,
.dark .bg-[var(--loop-blue)] *,
.dark .bg-[var(--loop-purple)] *,
.dark .bg-[var(--loop-pink)] * {
  color: #000000 !important;
}

/* Safety Zone Border Preservation */
.dark .bg-[var(--loop-yellow)],
.dark .bg-[var(--loop-green)],
.dark .bg-[var(--loop-blue)],
.dark .bg-[var(--loop-purple)],
.dark .bg-[var(--loop-pink)] {
  border-color: #000000 !important;
}
```

### Rule 3: Input Isolation

All form inputs must have explicit dark backgrounds to prevent "vanishing input" syndrome:

```css
.dark input,
.dark select,
.dark textarea {
  background-color: #1a1a1a !important;
  color: #FFFFFF !important;
  border: 2px solid #FFFFFF !important;
}

.dark input::placeholder,
.dark textarea::placeholder {
  color: #9CA3AF !important;
}
```

### Rule 4: Sidebar Navigation Exception

Sidebar module buttons use LOOP colors when **active**, but the text must remain readable:

- **Inactive buttons:** White text on dark surface
- **Active buttons:** Black text on LOOP color background (Safety Zone)

```css
/* Sidebar text override - ensures visibility */
.dark nav span,
.dark nav a > div > span:last-child {
  color: #FFFFFF !important;
}
```

### Rule 5: Table & Kanban Headers

Data-heavy components need explicit white text enforcement:

```css
.dark table td,
.dark table th {
  color: #FFFFFF !important;
}

.dark .font-black.text-lg {
  color: #FFFFFF !important;
}
```

---

## 5. Implementation Standards

### Typography

| Element | Font Weight | Size | Transform |
|---------|-------------|------|-----------|
| Page Headers | `font-black` (900) | `text-xl` to `text-4xl` | `uppercase` |
| Section Headers | `font-bold` (700) | `text-lg` | `uppercase` |
| Body Text | `font-medium` (500) | `text-base` | None |
| Labels | `font-bold` (700) | `text-sm` | `uppercase` |
| Button Text | `font-bold` (700) | `text-sm` | `uppercase` |

**Font Stack:** System sans-serif (Inter, Roboto, or SF Pro fallback)

### Borders

All Neo-Brutalist containers use thick, visible borders:

```css
/* Standard container */
.brutal-container {
  border: 2px solid black;
}

/* Dark mode */
.dark .brutal-container {
  border: 2px solid white;
}
```

**Border Width:** Always `2px` for primary elements, `1px` for subtle dividers.

### Shadows

Hard shadows with no blur, creating a "sticker" or "stacked paper" effect:

```css
/* Light Mode */
.brutal-shadow {
  box-shadow: 6px 6px 0px 0px #000000;
}

/* Dark Mode */
.dark .brutal-shadow {
  box-shadow: 6px 6px 0px 0px var(--shadow-color);
}
```

**Shadow Offsets:**
- Large elements (cards, modals): `6px 6px`
- Medium elements (buttons): `4px 4px`
- Small elements (badges): `2px 2px`

### Spacing

| Element | Padding | Margin |
|---------|---------|--------|
| Page Container | `p-6` to `p-8` | - |
| Cards | `p-4` to `p-6` | `mb-4` |
| Buttons | `px-4 py-2` to `px-6 py-3` | - |
| Form Inputs | `px-3 py-2` | `mb-4` |

### Interactive States

```css
/* Hover - subtle opacity reduction */
.brutal-button:hover {
  opacity: 0.9;
}

/* Active - pressed shadow */
.brutal-button:active {
  transform: translate(2px, 2px);
  box-shadow: 4px 4px 0px 0px var(--shadow-color);
}

/* Focus - high contrast ring */
.brutal-input:focus {
  outline: 2px solid var(--loop-yellow);
  outline-offset: 2px;
}
```

---

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════════╗
║  NONPROFIT MANAGER - UI QUICK REFERENCE                          ║
╠═══════════════════════════════════════════════════════════════════╣
║  COLORS                                                           ║
║  ├─ Dashboard:  #FFD700 (Gold)                                    ║
║  ├─ Linking:    #90EE90 (Green)                                   ║
║  ├─ Operations: #87CEEB (Blue)                                    ║
║  ├─ Outreach:   #D8BFD8 (Purple)                                  ║
║  └─ People:     #FFB6C1 (Pink)                                    ║
║                                                                   ║
║  DARK MODE                                                        ║
║  ├─ Background: #121212                                           ║
║  ├─ Surface:    #1A1A1A                                           ║
║  ├─ Text:       #FFFFFF                                           ║
║  ├─ Borders:    #FFFFFF                                           ║
║  └─ Inputs:     #1A1A1A bg, #FFFFFF border                        ║
║                                                                   ║
║  SAFETY ZONES (Always Black Text)                                 ║
║  └─ Any element with LOOP color background                        ║
║                                                                   ║
║  SHADOWS                                                          ║
║  └─ 6px 6px 0px 0px (no blur, hard edge)                          ║
║                                                                   ║
║  BORDERS                                                          ║
║  └─ 2px solid (always visible)                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-03 | Design System Architect | Initial constitution freeze |

---

*This document is the single source of truth for UI decisions. When in doubt, reference this file.*
