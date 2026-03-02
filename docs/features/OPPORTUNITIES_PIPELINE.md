# Opportunities Pipeline

## Overview

The opportunities pipeline introduces a dedicated stage-based domain for opportunity tracking.

Design goals:
- Keep opportunity workflow independent from donation transaction records.
- Support ordered stage pipelines per organization.
- Track stage transition history.
- Offer board/list style operational UI.

## API Surface

Alias routes:
- `GET /api/opportunities/stages`
- `POST /api/opportunities/stages`
- `PUT /api/opportunities/stages/:stageId`
- `POST /api/opportunities/stages/reorder`
- `GET /api/opportunities`
- `GET /api/opportunities/summary`
- `GET /api/opportunities/:id`
- `POST /api/opportunities`
- `PUT /api/opportunities/:id`
- `POST /api/opportunities/:id/move-stage`
- `DELETE /api/opportunities/:id`

Canonical v2 route:
- `/api/v2/opportunities/*`

## Data Model

Tables:
- `opportunity_stages`
- `opportunities`
- `opportunity_stage_history`

Migration:
- `database/migrations/055_opportunities_pipeline.sql`

Notes:
- Default stages are lazily created per organization in service logic.
- `donation_id` is optional and validated when provided.

## Stage Governance

- Stage order is organization-scoped.
- Reorder operations must include all stage IDs exactly once.
- Stage transitions append to `opportunity_stage_history`.

## Frontend

Route:
- `/opportunities`

Primary capabilities:
- Create/edit/delete opportunities.
- Move opportunities across stages.
- Reorder stages.
- View summary metrics and weighted amount.

Key files:
- `frontend/src/store/slices/opportunitiesSlice.ts`
- `frontend/src/pages/engagement/opportunities/OpportunitiesPage.tsx`
- `frontend/src/types/opportunity.ts`
