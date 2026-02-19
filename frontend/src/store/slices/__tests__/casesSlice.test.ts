import { describe, it, expect } from 'vitest';
import reducer, {
  setFilters,
  clearFilters,
  clearCurrentCase,
  clearError,
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
  fetchCaseNotes,
  createCaseNote,
  fetchCaseTypes,
  fetchCaseStatuses,
  fetchCaseSummary,
  fetchCaseOutcomeDefinitions,
  fetchInteractionOutcomes,
  saveInteractionOutcomes,
  selectCasesByAssignee,
  selectCasesByContact,
  selectUrgentCases,
  selectOverdueCases,
  selectCasesDueWithinDays,
  selectUnassignedCases,
  selectActiveCases,
  selectCasesByPriority,
} from '../casesSlice';
import type { CasesState } from '../../../types/case';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeCase = (overrides: Partial<CasesState['cases'][number]> = {}): CasesState['cases'][number] => ({
  id: 'case-1',
  case_number: 'CASE-240101-00001',
  contact_id: 'contact-1',
  case_type_id: 'type-1',
  status_id: 'status-1',
  title: 'Test Case',
  description: null,
  priority: 'medium',
  source: null,
  referral_source: null,
  assigned_to: 'user-1',
  assigned_team: null,
  due_date: null,
  intake_data: null,
  custom_data: null,
  tags: null,
  is_urgent: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-1',
  modified_by: 'user-1',
  status_type: 'intake',
  case_type_name: 'General',
  status_name: 'Intake',
  contact_first_name: 'Jane',
  contact_last_name: 'Doe',
  notes_count: 0,
  documents_count: 0,
  ...overrides,
});

const initialState: CasesState = {
  cases: [],
  currentCase: null,
  caseTypes: [],
  caseStatuses: [],
  caseNotes: [],
  caseMilestones: [],
  caseRelationships: [],
  caseServices: [],
  caseOutcomeDefinitions: [],
  interactionOutcomeImpacts: {},
  summary: null,
  total: 0,
  loading: false,
  error: null,
  outcomesLoading: false,
  outcomesSaving: false,
  outcomesError: null,
  filters: { page: 1, limit: 20, sort_by: 'created_at', sort_order: 'desc' },
  selectedCaseIds: [],
};

const wrapState = (cases: CasesState['cases']): { cases: CasesState } => ({
  cases: { ...initialState, cases },
});

// ─── Reducers ─────────────────────────────────────────────────────────────────

describe('casesSlice reducers', () => {
  it('merges partial filter updates', () => {
    const state = reducer(initialState, setFilters({ page: 2, contact_id: 'c-1' }));
    expect(state.filters.page).toBe(2);
    expect((state.filters as Record<string, unknown>).contact_id).toBe('c-1');
    expect(state.filters.limit).toBe(20);
  });

  it('clearFilters resets to initial filter state', () => {
    const dirty = reducer(initialState, setFilters({ page: 5, limit: 50 }));
    const state = reducer(dirty, clearFilters());
    expect(state.filters).toEqual(initialState.filters);
  });

  it('clearCurrentCase nulls case and empties notes', () => {
    const withCase = { ...initialState, currentCase: makeCase(), caseNotes: [{ id: 'n1' }] as never[] };
    const state = reducer(withCase, clearCurrentCase());
    expect(state.currentCase).toBeNull();
    expect(state.caseNotes).toHaveLength(0);
  });

  it('clearError sets error to null', () => {
    const state = reducer({ ...initialState, error: 'Bad request' }, clearError());
    expect(state.error).toBeNull();
  });
});

// ─── Async thunks – state transitions ─────────────────────────────────────────

describe('fetchCases thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer({ ...initialState, error: 'old' }, { type: fetchCases.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates cases and total on fulfilled', () => {
    const cases = [makeCase()];
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchCases.fulfilled.type, payload: { cases, total: 1 } }
    );
    expect(state.loading).toBe(false);
    expect(state.cases).toHaveLength(1);
    expect(state.total).toBe(1);
  });

  it('sets error string on rejected (rejectWithValue)', () => {
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchCases.rejected.type, payload: 'Failed to fetch cases' }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Failed to fetch cases');
  });
});

describe('createCase thunk', () => {
  it('prepends new case and increments total on fulfilled', () => {
    const existing = makeCase({ id: 'case-existing' });
    const created = makeCase({ id: 'case-new' });
    const state = reducer(
      { ...initialState, cases: [existing], total: 1 },
      { type: createCase.fulfilled.type, payload: created }
    );
    expect(state.cases[0].id).toBe('case-new');
    expect(state.total).toBe(2);
  });
});

describe('updateCase thunk', () => {
  it('replaces the matching case in the list', () => {
    const original = makeCase({ title: 'Original' });
    const updated = makeCase({ title: 'Updated' });
    const state = reducer(
      { ...initialState, cases: [original] },
      { type: updateCase.fulfilled.type, payload: updated }
    );
    expect(state.cases[0].title).toBe('Updated');
  });

  it('also syncs currentCase when IDs match', () => {
    const updated = makeCase({ title: 'Updated' });
    const state = reducer(
      { ...initialState, cases: [makeCase()], currentCase: makeCase() },
      { type: updateCase.fulfilled.type, payload: updated }
    );
    expect(state.currentCase?.title).toBe('Updated');
  });
});

describe('deleteCase thunk', () => {
  it('removes the case from the list and decrements total', () => {
    const second = makeCase({ id: 'case-2' });
    const state = reducer(
      { ...initialState, cases: [makeCase(), second], total: 2 },
      { type: deleteCase.fulfilled.type, payload: 'case-1' }
    );
    expect(state.cases).toHaveLength(1);
    expect(state.cases[0].id).toBe('case-2');
    expect(state.total).toBe(1);
  });

  it('clears currentCase when the deleted case was open', () => {
    const state = reducer(
      { ...initialState, cases: [makeCase()], currentCase: makeCase(), total: 1 },
      { type: deleteCase.fulfilled.type, payload: 'case-1' }
    );
    expect(state.currentCase).toBeNull();
  });
});

describe('fetchCaseNotes thunk', () => {
  it('replaces caseNotes on fulfilled', () => {
    const notes = [{ id: 'n1', content: 'First note' }] as never[];
    const state = reducer(
      { ...initialState, caseNotes: [] },
      { type: fetchCaseNotes.fulfilled.type, payload: notes }
    );
    expect(state.caseNotes).toHaveLength(1);
  });
});

describe('createCaseNote thunk', () => {
  it('prepends note and increments notes_count on currentCase', () => {
    const newNote = { id: 'n-new', content: 'New note' };
    const state = reducer(
      { ...initialState, currentCase: makeCase({ notes_count: 2 }), caseNotes: [] },
      { type: createCaseNote.fulfilled.type, payload: newNote }
    );
    expect(state.caseNotes[0]).toEqual(newNote);
    expect(state.currentCase?.notes_count).toBe(3);
  });
});

describe('outcomes thunks', () => {
  it('stores case outcome definitions on fulfilled', () => {
    const definitions = [
      {
        id: 'outcome-1',
        key: 'maintained_employment',
        name: 'Maintained employment',
        description: null,
        category: 'employment',
        is_active: true,
        is_reportable: true,
        sort_order: 10,
        created_at: '2026-02-19T00:00:00.000Z',
        updated_at: '2026-02-19T00:00:00.000Z',
      },
    ];

    const state = reducer(initialState, {
      type: fetchCaseOutcomeDefinitions.fulfilled.type,
      payload: definitions,
    });

    expect(state.caseOutcomeDefinitions).toEqual(definitions);
  });

  it('maps interaction outcomes into both note and lookup table', () => {
    const base = {
      ...initialState,
      caseNotes: [{ id: 'note-1', content: 'text' }] as never[],
    };
    const impacts = [
      {
        id: 'impact-1',
        interaction_id: 'note-1',
        outcome_definition_id: 'outcome-1',
        impact: true,
        attribution: 'DIRECT',
        intensity: null,
        evidence_note: null,
        created_by_user_id: null,
        created_at: '2026-02-19T00:00:00.000Z',
        updated_at: '2026-02-19T00:00:00.000Z',
        outcome_definition: {
          id: 'outcome-1',
          key: 'maintained_employment',
          name: 'Maintained employment',
          description: null,
          category: 'employment',
          is_active: true,
          is_reportable: true,
          sort_order: 10,
          created_at: '2026-02-19T00:00:00.000Z',
          updated_at: '2026-02-19T00:00:00.000Z',
        },
      },
    ];

    const fetched = reducer(base, {
      type: fetchInteractionOutcomes.fulfilled.type,
      payload: { interactionId: 'note-1', impacts },
    });

    expect(fetched.interactionOutcomeImpacts?.['note-1']).toEqual(impacts);
    expect((fetched.caseNotes[0] as { outcome_impacts?: unknown[] }).outcome_impacts).toEqual(impacts);

    const saved = reducer(fetched, {
      type: saveInteractionOutcomes.fulfilled.type,
      payload: { interactionId: 'note-1', impacts: [] },
    });

    expect(saved.interactionOutcomeImpacts?.['note-1']).toEqual([]);
    expect((saved.caseNotes[0] as { outcome_impacts?: unknown[] }).outcome_impacts).toEqual([]);
  });
});

describe('fetchCaseTypes / fetchCaseStatuses / fetchCaseSummary thunks', () => {
  it('sets caseTypes on fulfilled', () => {
    const types = [{ id: 't1', name: 'General' }] as never[];
    const state = reducer(initialState, { type: fetchCaseTypes.fulfilled.type, payload: types });
    expect(state.caseTypes).toHaveLength(1);
  });

  it('sets caseStatuses on fulfilled', () => {
    const statuses = [{ id: 's1', name: 'Intake', status_type: 'intake' }] as never[];
    const state = reducer(initialState, { type: fetchCaseStatuses.fulfilled.type, payload: statuses });
    expect(state.caseStatuses).toHaveLength(1);
  });

  it('sets summary on fulfilled', () => {
    const summary = { total: 10, open: 8, closed: 2 } as never;
    const state = reducer(initialState, { type: fetchCaseSummary.fulfilled.type, payload: summary });
    expect(state.summary).toEqual(summary);
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────────

describe('selectCasesByAssignee', () => {
  it('returns only cases assigned to the given user', () => {
    const cases = [
      makeCase({ id: 'c1', assigned_to: 'user-a' }),
      makeCase({ id: 'c2', assigned_to: 'user-b' }),
      makeCase({ id: 'c3', assigned_to: 'user-a' }),
    ];
    const result = selectCasesByAssignee(wrapState(cases), 'user-a');
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c3']);
  });
});

describe('selectCasesByContact', () => {
  it('filters by contact_id', () => {
    const cases = [
      makeCase({ id: 'c1', contact_id: 'contact-x' }),
      makeCase({ id: 'c2', contact_id: 'contact-y' }),
    ];
    const result = selectCasesByContact(wrapState(cases), 'contact-x');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });
});

describe('selectUrgentCases', () => {
  it('includes is_urgent=true cases', () => {
    const cases = [
      makeCase({ id: 'urgent', is_urgent: true }),
      makeCase({ id: 'normal', is_urgent: false }),
    ];
    const result = selectUrgentCases(wrapState(cases));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('urgent');
  });

  it('includes priority="urgent" cases even when is_urgent is false', () => {
    const cases = [makeCase({ id: 'prio-urgent', priority: 'urgent', is_urgent: false })];
    const result = selectUrgentCases(wrapState(cases));
    expect(result).toHaveLength(1);
  });
});

describe('selectOverdueCases', () => {
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  it('returns active cases whose due_date is in the past', () => {
    const cases = [
      makeCase({ id: 'overdue', due_date: pastDate, status_type: 'intake' }),
      makeCase({ id: 'future', due_date: futureDate, status_type: 'intake' }),
      makeCase({ id: 'no-date', due_date: null, status_type: 'intake' }),
    ];
    const result = selectOverdueCases(wrapState(cases));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('overdue');
  });

  it('excludes closed cases even if past due', () => {
    const cases = [makeCase({ id: 'closed-overdue', due_date: pastDate, status_type: 'closed' })];
    expect(selectOverdueCases(wrapState(cases))).toHaveLength(0);
  });

  it('excludes cancelled cases', () => {
    const cases = [makeCase({ id: 'cancelled', due_date: pastDate, status_type: 'cancelled' })];
    expect(selectOverdueCases(wrapState(cases))).toHaveLength(0);
  });
});

describe('selectCasesDueWithinDays', () => {
  it('returns active cases due between now and the specified horizon', () => {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const cases = [
      makeCase({ id: 'soon', due_date: in3Days, status_type: 'intake' }),
      makeCase({ id: 'later', due_date: in10Days, status_type: 'intake' }),
    ];
    const result = selectCasesDueWithinDays(wrapState(cases), 7);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('soon');
  });

  it('excludes past-due cases (they are overdue, not due soon)', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cases = [makeCase({ due_date: yesterday, status_type: 'intake' })];
    expect(selectCasesDueWithinDays(wrapState(cases), 7)).toHaveLength(0);
  });
});

describe('selectUnassignedCases', () => {
  it('returns active cases with no assignee', () => {
    const cases = [
      makeCase({ id: 'unassigned', assigned_to: undefined, status_type: 'intake' }),
      makeCase({ id: 'assigned', assigned_to: 'user-1', status_type: 'intake' }),
    ];
    const result = selectUnassignedCases(wrapState(cases));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('unassigned');
  });

  it('excludes closed unassigned cases', () => {
    const cases = [makeCase({ assigned_to: undefined, status_type: 'closed' })];
    expect(selectUnassignedCases(wrapState(cases))).toHaveLength(0);
  });
});

describe('selectActiveCases', () => {
  it('returns cases that are not closed or cancelled', () => {
    const cases = [
      makeCase({ id: 'active', status_type: 'intake' }),
      makeCase({ id: 'closed', status_type: 'closed' }),
      makeCase({ id: 'cancelled', status_type: 'cancelled' }),
      makeCase({ id: 'in-progress', status_type: 'open' }),
    ];
    const result = selectActiveCases(wrapState(cases));
    expect(result.map((c) => c.id)).toEqual(['active', 'in-progress']);
  });
});

describe('selectCasesByPriority', () => {
  it('counts active cases by priority', () => {
    const cases = [
      makeCase({ priority: 'high', status_type: 'intake' }),
      makeCase({ priority: 'high', status_type: 'intake' }),
      makeCase({ priority: 'medium', status_type: 'open' }),
      makeCase({ priority: 'low', status_type: 'intake' }),
      makeCase({ priority: 'high', status_type: 'closed' }), // should be excluded
    ];
    const result = selectCasesByPriority(wrapState(cases));
    expect(result.high).toBe(2);
    expect(result.medium).toBe(1);
    expect(result.low).toBe(1);
    expect(result.urgent).toBe(0);
  });
});
