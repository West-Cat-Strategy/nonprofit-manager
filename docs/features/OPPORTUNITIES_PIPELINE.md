# Opportunities Pipeline

**Last Updated:** 2026-04-19


## Overview

The opportunities pipeline introduces a dedicated stage-based domain for opportunity tracking.

Design goals:
- Keep opportunity workflow independent from donation transaction records.
- Support ordered stage pipelines per organization.
- Track stage transition history.
- Offer board/list style operational UI.

## API Surface

Alias routes:
- `GET /api/v2/opportunities/stages`
- `POST /api/v2/opportunities/stages`
- `PUT /api/v2/opportunities/stages/:stageId`
- `POST /api/v2/opportunities/stages/reorder`
- `GET /api/v2/opportunities`
- `GET /api/v2/opportunities/summary`
- `GET /api/v2/opportunities/:id`
- `POST /api/v2/opportunities`
- `PUT /api/v2/opportunities/:id`
- `POST /api/v2/opportunities/:id/move-stage`
- `DELETE /api/v2/opportunities/:id`

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
- `frontend/src/features/engagement/opportunities/state/opportunitiesCore.ts`
- `frontend/src/features/engagement/opportunities/pages/OpportunitiesPage.tsx`
- `frontend/src/types/opportunity.ts`
