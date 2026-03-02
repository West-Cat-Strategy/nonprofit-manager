import { describe, expect, it } from 'vitest';
import reducer, {
  clearOpportunitiesError,
  createOpportunity,
  createOpportunityStage,
  deleteOpportunity,
  fetchOpportunities,
  fetchOpportunityStages,
  fetchOpportunitySummary,
  moveOpportunityStage,
  reorderOpportunityStages,
  updateOpportunity,
  updateOpportunityStage,
} from '../opportunitiesSlice';

const makeStage = (overrides: Record<string, unknown> = {}) => ({
  id: 'stage-1',
  organization_id: 'org-1',
  name: 'Prospecting',
  stage_order: 0,
  probability: 10,
  is_closed: false,
  is_won: false,
  is_active: true,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

const makeOpportunity = (overrides: Record<string, unknown> = {}) => ({
  id: 'opp-1',
  organization_id: 'org-1',
  name: 'Community Grant',
  stage_id: 'stage-1',
  stage_name: 'Prospecting',
  stage_order: 0,
  amount: '2500.00',
  currency: 'USD',
  status: 'open',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

const initialState = {
  opportunities: [],
  stages: [],
  summary: null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  loading: false,
  error: null,
};

describe('opportunitiesSlice reducers', () => {
  it('clears errors', () => {
    const state = reducer({ ...initialState, error: 'boom' }, clearOpportunitiesError());
    expect(state.error).toBeNull();
  });
});

describe('opportunitiesSlice async reducers', () => {
  it('sets stages from fetch', () => {
    const state = reducer(
      initialState,
      { type: fetchOpportunityStages.fulfilled.type, payload: [makeStage()] }
    );

    expect(state.stages).toHaveLength(1);
  });

  it('applies stage create/update/reorder', () => {
    const created = reducer(
      initialState,
      { type: createOpportunityStage.fulfilled.type, payload: makeStage({ id: 'stage-2', stage_order: 1 }) }
    );

    const updated = reducer(
      { ...created, stages: [makeStage(), makeStage({ id: 'stage-2', stage_order: 1 })] },
      { type: updateOpportunityStage.fulfilled.type, payload: makeStage({ id: 'stage-2', name: 'Proposal', stage_order: 1 }) }
    );

    expect(updated.stages.find((stage) => stage.id === 'stage-2')?.name).toBe('Proposal');

    const reordered = reducer(
      updated,
      {
        type: reorderOpportunityStages.fulfilled.type,
        payload: [makeStage({ id: 'stage-2', stage_order: 0 }), makeStage({ id: 'stage-1', stage_order: 1 })],
      }
    );

    expect(reordered.stages[0].id).toBe('stage-2');
  });

  it('sets opportunities and pagination from fetch', () => {
    const state = reducer(
      initialState,
      {
        type: fetchOpportunities.fulfilled.type,
        payload: {
          data: [makeOpportunity()],
          pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        },
      }
    );

    expect(state.opportunities).toHaveLength(1);
    expect(state.pagination.total).toBe(1);
  });

  it('upserts opportunities on create/update/move', () => {
    const created = reducer(
      initialState,
      { type: createOpportunity.fulfilled.type, payload: makeOpportunity() }
    );

    const updated = reducer(
      created,
      { type: updateOpportunity.fulfilled.type, payload: makeOpportunity({ name: 'Updated Name' }) }
    );
    expect(updated.opportunities[0].name).toBe('Updated Name');

    const moved = reducer(
      updated,
      { type: moveOpportunityStage.fulfilled.type, payload: makeOpportunity({ stage_id: 'stage-2' }) }
    );

    expect(moved.opportunities[0].stage_id).toBe('stage-2');
  });

  it('removes opportunity on delete and stores summary', () => {
    const withSummary = reducer(
      initialState,
      {
        type: fetchOpportunitySummary.fulfilled.type,
        payload: {
          total: 1,
          open: 1,
          won: 0,
          lost: 0,
          weighted_amount: 500,
          stage_totals: [],
        },
      }
    );

    const withOpportunity = reducer(
      { ...withSummary, opportunities: [makeOpportunity()] as never[] },
      { type: deleteOpportunity.fulfilled.type, payload: 'opp-1' }
    );

    expect(withOpportunity.summary?.total).toBe(1);
    expect(withOpportunity.opportunities).toHaveLength(0);
  });
});
