# UI/UX Workboard Review and Ergonomic Hardening

**Date:** 2026-10-11  
**Status:** Review complete; recommendations signed out in Ready  
**Context:** Comprehensive usability, functionality, and expected working functions audit across all browser-based surfaces (Staff Workspace, Constituent Portal, Public Workflows, and Administration). Full audit artifact recorded in [UI_UX_COMPREHENSIVE_REVIEW_2026-10-11.md](UI_UX_COMPREHENSIVE_REVIEW_2026-10-11.md).

## Verification Baseline

| Check | Result |
| --- | --- |
| `npm run lint --prefix frontend` | Passed: 0 errors, 0 warnings across all frontend feature domains and routes |
| `npm run type-check --prefix frontend` | Passed: 0 TypeScript errors across frontend and shared contracts |
| Route catalog consistency | Synchronized: 100% agreement across route definitions, permissions, and metadata |
| Automated UX regressions | `e2e/tests/ux-regression.spec.ts` verified for mobile drawer, compact layouts, dialog traps |
| Theme & accessibility audits | `e2e/tests/dark-mode-accessibility-audit.spec.ts` verified across all 6 registered themes |

## Ergonomic Findings & Signed-Out Rows

### 1. Operations Kanban Drag-and-Drop Progression (`P5-T152`)
- **Current State:** The Operations Kanban board (`/operations`) renders tasks in three columns (`TO DO`, `IN PROGRESS`, `DONE`), but changing task status requires navigating to task detail or edit views.
- **Remediation:** Integrate `@dnd-kit/core` and `@dnd-kit/sortable` (matching the website builder implementation) into `OperationsBoardPage` to allow direct pointer/touch drag-and-drop between status columns, triggering optimistic updates and background API persistence.
- **Constraints:** Preserve existing category filtering (HR, Admin, Finance, Tech), due-date sorting, mobile responsiveness, and Neo-Brutalist design tokens.

### 2. Client Portal Persistent Mobile Bottom Navigation (`P5-T153`)
- **Current State:** Mobile portal users must expand a top-of-content `<details>` dropdown to navigate between Portal sub-pages, requiring vertical scrolling on mobile viewports.
- **Remediation:** Implement a fixed bottom navigation bar on mobile viewports (`< 768px`) in `PortalLayout.tsx` for high-frequency actions (`Dashboard`, `Appointments`, `Messages`, `Documents`), keeping secondary links in an overflow drawer.
- **Constraints:** Maintain client privacy sandboxing, focus restoration, touch targets ≥ 48px, and WCAG contrast.

### 3. Contact Merge Visual Conflict Diffing (`P5-T154`)
- **Current State:** `ContactMergeDialog` prompts staff to select master and merge records without visually highlighting conflicting field values (e.g. conflicting phone numbers, addresses, or donor preferences).
- **Remediation:** Implement a side-by-side field diff inspection matrix in `ContactMergeDialog` comparing master vs. secondary contact fields with field-level radio selection for custom resolution before executing the merge.
- **Constraints:** Preserve existing merge endpoints and backend contact child record migration rules.

### 4. Grant Lifecycle Consolidated Command Center Workspace (`P5-T155`)
- **Current State:** The Grants module spans 11 discrete sub-routes (`/grants/funders`, `/grants/programs`, `/grants/applications`, `/grants/awards`, `/grants/disbursements`, etc.), leading to navigation fatigue for grant officers.
- **Remediation:** Introduce a unified Grants Command Center overview on `/grants` that consolidates the active pipeline, deadline calendar, upcoming disbursements, and compliance reports into a tabbed high-level overview.
- **Constraints:** Retain deep-linking compatibility for all existing sub-routes in `grantsRoutes.tsx` and preserve route catalog metadata.

### 5. Admin System Audit Log Visual Change Diffing (`P5-T156`)
- **Current State:** `AuditLogsSection` in Admin Settings displays raw JSON strings for change payloads, making inspection difficult for non-technical administrators.
- **Remediation:** Enhance the audit log inspection modal with formatted, color-coded key-value diffing (`Old Value` vs `New Value`) with collapsible sections for unchanged data.
- **Constraints:** Fall back gracefully to structured JSON viewer for arbitrary payloads; maintain TanStack Table virtual scrolling performance.

### 6. Custom Report Builder Progressive Query Execution Feedback (`P5-T157`)
- **Current State:** `ReportBuilderPage` displays a generic spinner during report generation, providing no feedback for complex multi-entity aggregations.
- **Remediation:** Add multi-stage execution progress cues ("Compiling query...", "Aggregating records...", "Formatting data table...") and cancel affordance during preview generation.
- **Constraints:** Preserve existing `/api/v2/reports/preview` and `/api/v2/reports/builder` API contracts.
