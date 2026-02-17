import { describe, it, expect } from 'vitest';
import reducer, {
  setFilters,
  clearFilters,
  clearEntityFollowUps,
  clearSelectedFollowUp,
  clearError,
  fetchFollowUps,
  fetchEntityFollowUps,
  fetchFollowUpById,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  cancelFollowUp,
  rescheduleFollowUp,
  deleteFollowUp,
  fetchFollowUpSummary,
  fetchUpcomingFollowUps,
  selectEntityFollowUps,
  selectScheduledFollowUps,
  selectOverdueFollowUps,
  selectCompletedFollowUps,
} from '../followUpsSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeFollowUp = (overrides: Record<string, unknown> = {}) => ({
  id: 'fu-1',
  entity_type: 'case',
  entity_id: 'case-1',
  title: 'Check in with client',
  status: 'scheduled',
  scheduled_date: '2024-06-15',
  scheduled_time: null,
  notes: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const initialState = {
  followUps: [] as ReturnType<typeof makeFollowUp>[],
  entityFollowUps: [] as ReturnType<typeof makeFollowUp>[],
  selectedFollowUp: null as ReturnType<typeof makeFollowUp> | null,
  summary: null,
  upcoming: [] as ReturnType<typeof makeFollowUp>[],
  loading: false,
  entityLoading: false,
  error: null as string | null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  filters: {},
};

const wrapState = (entityFollowUps: ReturnType<typeof makeFollowUp>[]) => ({
  followUps: { ...initialState, entityFollowUps },
});

// ─── Reducers ─────────────────────────────────────────────────────────────────

describe('followUpsSlice reducers', () => {
  it('setFilters replaces the entire filters object', () => {
    const state = reducer(
      { ...initialState, filters: { status: 'scheduled' } },
      setFilters({ status: 'completed' })
    );
    expect(state.filters).toEqual({ status: 'completed' });
  });

  it('clearFilters resets filters to an empty object', () => {
    const state = reducer(
      { ...initialState, filters: { status: 'scheduled', entity_type: 'case' } },
      clearFilters()
    );
    expect(state.filters).toEqual({});
  });

  it('clearEntityFollowUps empties the entityFollowUps array', () => {
    const state = reducer(
      { ...initialState, entityFollowUps: [makeFollowUp()] as never[] },
      clearEntityFollowUps()
    );
    expect(state.entityFollowUps).toHaveLength(0);
  });

  it('clearSelectedFollowUp sets selectedFollowUp to null', () => {
    const state = reducer(
      { ...initialState, selectedFollowUp: makeFollowUp() as never },
      clearSelectedFollowUp()
    );
    expect(state.selectedFollowUp).toBeNull();
  });

  it('clearError sets error to null', () => {
    const state = reducer({ ...initialState, error: 'Some error' }, clearError());
    expect(state.error).toBeNull();
  });
});

// ─── fetchFollowUps thunk ─────────────────────────────────────────────────────

describe('fetchFollowUps thunk', () => {
  it('sets loading=true and clears error on pending', () => {
    const state = reducer(
      { ...initialState, error: 'old error' },
      { type: fetchFollowUps.pending.type }
    );
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates followUps and pagination on fulfilled', () => {
    const followUps = [makeFollowUp()];
    const pagination = { page: 1, limit: 20, total: 1, pages: 1 };
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchFollowUps.fulfilled.type, payload: { data: followUps, pagination } }
    );
    expect(state.loading).toBe(false);
    expect(state.followUps).toHaveLength(1);
    expect(state.pagination.total).toBe(1);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchFollowUps.rejected.type, error: { message: 'Network error' } }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });
});

// ─── fetchEntityFollowUps thunk ───────────────────────────────────────────────

describe('fetchEntityFollowUps thunk', () => {
  it('sets entityLoading (not loading) on pending', () => {
    const state = reducer(initialState, { type: fetchEntityFollowUps.pending.type });
    expect(state.entityLoading).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('populates entityFollowUps on fulfilled', () => {
    const followUps = [makeFollowUp(), makeFollowUp({ id: 'fu-2' })];
    const state = reducer(
      { ...initialState, entityLoading: true },
      { type: fetchEntityFollowUps.fulfilled.type, payload: followUps }
    );
    expect(state.entityLoading).toBe(false);
    expect(state.entityFollowUps).toHaveLength(2);
  });

  it('sets error and clears entityLoading on rejected', () => {
    const state = reducer(
      { ...initialState, entityLoading: true },
      { type: fetchEntityFollowUps.rejected.type, error: { message: 'Not found' } }
    );
    expect(state.entityLoading).toBe(false);
    expect(state.error).toBe('Not found');
  });
});

// ─── fetchFollowUpById thunk ──────────────────────────────────────────────────

describe('fetchFollowUpById thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: fetchFollowUpById.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets selectedFollowUp on fulfilled', () => {
    const fu = makeFollowUp({ id: 'fu-detail' });
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchFollowUpById.fulfilled.type, payload: fu }
    );
    expect(state.loading).toBe(false);
    expect(state.selectedFollowUp).toEqual(fu);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: fetchFollowUpById.rejected.type, error: { message: 'Not found' } }
    );
    expect(state.error).toBe('Not found');
  });
});

// ─── createFollowUp thunk ─────────────────────────────────────────────────────

describe('createFollowUp thunk', () => {
  it('prepends to BOTH entityFollowUps and followUps on fulfilled', () => {
    const existing = makeFollowUp({ id: 'fu-old' });
    const created = makeFollowUp({ id: 'fu-new' });
    const state = reducer(
      { ...initialState, entityFollowUps: [existing] as never[], followUps: [existing] as never[] },
      { type: createFollowUp.fulfilled.type, payload: created }
    );
    expect(state.entityFollowUps[0].id).toBe('fu-new');
    expect(state.followUps[0].id).toBe('fu-new');
    expect(state.entityFollowUps).toHaveLength(2);
    expect(state.followUps).toHaveLength(2);
  });
});

// ─── updateFollowUp thunk ─────────────────────────────────────────────────────

describe('updateFollowUp thunk', () => {
  it('updates in entityFollowUps, followUps, and selectedFollowUp on fulfilled', () => {
    const original = makeFollowUp({ status: 'scheduled' });
    const updated = makeFollowUp({ status: 'completed' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [original] as never[],
        followUps: [original] as never[],
        selectedFollowUp: original as never,
      },
      { type: updateFollowUp.fulfilled.type, payload: updated }
    );
    expect(state.entityFollowUps[0].status).toBe('completed');
    expect(state.followUps[0].status).toBe('completed');
    expect(state.selectedFollowUp?.status).toBe('completed');
  });

  it('does not update selectedFollowUp when IDs differ', () => {
    const selected = makeFollowUp({ id: 'fu-other' });
    const updated = makeFollowUp({ id: 'fu-1', status: 'completed' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [makeFollowUp()] as never[],
        followUps: [makeFollowUp()] as never[],
        selectedFollowUp: selected as never,
      },
      { type: updateFollowUp.fulfilled.type, payload: updated }
    );
    expect(state.selectedFollowUp?.id).toBe('fu-other');
  });
});

// ─── completeFollowUp thunk ───────────────────────────────────────────────────

describe('completeFollowUp thunk', () => {
  it('updates status in entityFollowUps and followUps on fulfilled', () => {
    const original = makeFollowUp({ status: 'scheduled' });
    const completed = makeFollowUp({ status: 'completed' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [original] as never[],
        followUps: [original] as never[],
      },
      { type: completeFollowUp.fulfilled.type, payload: completed }
    );
    expect(state.entityFollowUps[0].status).toBe('completed');
    expect(state.followUps[0].status).toBe('completed');
  });
});

// ─── cancelFollowUp thunk ─────────────────────────────────────────────────────

describe('cancelFollowUp thunk', () => {
  it('updates status to cancelled in both lists on fulfilled', () => {
    const original = makeFollowUp({ status: 'scheduled' });
    const cancelled = makeFollowUp({ status: 'cancelled' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [original] as never[],
        followUps: [original] as never[],
      },
      { type: cancelFollowUp.fulfilled.type, payload: cancelled }
    );
    expect(state.entityFollowUps[0].status).toBe('cancelled');
    expect(state.followUps[0].status).toBe('cancelled');
  });
});

// ─── rescheduleFollowUp thunk ─────────────────────────────────────────────────

describe('rescheduleFollowUp thunk', () => {
  it('updates scheduled_date in both lists on fulfilled', () => {
    const original = makeFollowUp({ scheduled_date: '2024-06-01' });
    const rescheduled = makeFollowUp({ scheduled_date: '2024-07-15' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [original] as never[],
        followUps: [original] as never[],
      },
      { type: rescheduleFollowUp.fulfilled.type, payload: rescheduled }
    );
    expect(state.entityFollowUps[0].scheduled_date).toBe('2024-07-15');
    expect(state.followUps[0].scheduled_date).toBe('2024-07-15');
  });
});

// ─── deleteFollowUp thunk ─────────────────────────────────────────────────────

describe('deleteFollowUp thunk', () => {
  it('removes follow-up from both entityFollowUps and followUps', () => {
    const second = makeFollowUp({ id: 'fu-2' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [makeFollowUp(), second] as never[],
        followUps: [makeFollowUp(), second] as never[],
      },
      { type: deleteFollowUp.fulfilled.type, payload: 'fu-1' }
    );
    expect(state.entityFollowUps).toHaveLength(1);
    expect(state.entityFollowUps[0].id).toBe('fu-2');
    expect(state.followUps).toHaveLength(1);
  });

  it('clears selectedFollowUp when the deleted follow-up was selected', () => {
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [makeFollowUp()] as never[],
        followUps: [makeFollowUp()] as never[],
        selectedFollowUp: makeFollowUp() as never,
      },
      { type: deleteFollowUp.fulfilled.type, payload: 'fu-1' }
    );
    expect(state.selectedFollowUp).toBeNull();
  });

  it('leaves selectedFollowUp intact when a different follow-up is deleted', () => {
    const selected = makeFollowUp({ id: 'fu-selected' });
    const state = reducer(
      {
        ...initialState,
        entityFollowUps: [makeFollowUp()] as never[],
        followUps: [makeFollowUp()] as never[],
        selectedFollowUp: selected as never,
      },
      { type: deleteFollowUp.fulfilled.type, payload: 'fu-1' }
    );
    expect(state.selectedFollowUp?.id).toBe('fu-selected');
  });
});

// ─── fetchFollowUpSummary & fetchUpcomingFollowUps thunks ─────────────────────

describe('fetchFollowUpSummary thunk', () => {
  it('sets summary on fulfilled', () => {
    const summary = { total: 10, scheduled: 5, overdue: 2, completed: 3 };
    const state = reducer(
      initialState,
      { type: fetchFollowUpSummary.fulfilled.type, payload: summary }
    );
    expect(state.summary).toEqual(summary);
  });
});

describe('fetchUpcomingFollowUps thunk', () => {
  it('sets upcoming on fulfilled', () => {
    const upcoming = [makeFollowUp(), makeFollowUp({ id: 'fu-2' })];
    const state = reducer(
      initialState,
      { type: fetchUpcomingFollowUps.fulfilled.type, payload: upcoming }
    );
    expect(state.upcoming).toHaveLength(2);
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────────

describe('selectEntityFollowUps', () => {
  it('returns the entityFollowUps array', () => {
    const fus = [makeFollowUp()];
    const result = selectEntityFollowUps(wrapState(fus as never[]));
    expect(result).toHaveLength(1);
  });
});

describe('selectScheduledFollowUps', () => {
  it('returns only follow-ups with status="scheduled"', () => {
    const fus = [
      makeFollowUp({ id: 'fu-1', status: 'scheduled' }),
      makeFollowUp({ id: 'fu-2', status: 'overdue' }),
      makeFollowUp({ id: 'fu-3', status: 'scheduled' }),
    ];
    const result = selectScheduledFollowUps(wrapState(fus as never[]));
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.status === 'scheduled')).toBe(true);
  });
});

describe('selectOverdueFollowUps', () => {
  it('returns only follow-ups with status="overdue"', () => {
    const fus = [
      makeFollowUp({ id: 'fu-1', status: 'overdue' }),
      makeFollowUp({ id: 'fu-2', status: 'scheduled' }),
    ];
    const result = selectOverdueFollowUps(wrapState(fus as never[]));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fu-1');
  });
});

describe('selectCompletedFollowUps', () => {
  it('returns only follow-ups with status="completed"', () => {
    const fus = [
      makeFollowUp({ id: 'fu-1', status: 'completed' }),
      makeFollowUp({ id: 'fu-2', status: 'completed' }),
      makeFollowUp({ id: 'fu-3', status: 'cancelled' }),
    ];
    const result = selectCompletedFollowUps(wrapState(fus as never[]));
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toEqual(['fu-1', 'fu-2']);
  });

  it('returns empty array when no follow-ups are completed', () => {
    const fus = [makeFollowUp({ status: 'scheduled' })];
    const result = selectCompletedFollowUps(wrapState(fus as never[]));
    expect(result).toHaveLength(0);
  });
});
