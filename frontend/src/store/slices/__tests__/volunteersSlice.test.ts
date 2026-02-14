import { describe, it, expect } from 'vitest';
import reducer, {
  setFilters,
  clearFilters,
  clearCurrentVolunteer,
  clearError,
  fetchVolunteers,
  fetchVolunteerById,
  fetchVolunteersBySkills,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  fetchVolunteerAssignments,
  createAssignment,
  updateAssignment,
} from '../volunteersSlice';
import type { VolunteersState, Volunteer, VolunteerAssignment } from '../volunteersSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeVolunteer = (overrides: Partial<Volunteer> = {}): Volunteer => ({
  volunteer_id: 'vol-1',
  contact_id: 'contact-1',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone: null,
  mobile_phone: null,
  skills: ['first_aid', 'driving'],
  availability_status: 'available',
  availability_notes: null,
  background_check_status: 'approved',
  background_check_date: null,
  background_check_expiry: null,
  preferred_roles: null,
  max_hours_per_week: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  volunteer_since: '2024-01-01',
  total_hours_logged: 0,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const makeAssignment = (overrides: Partial<VolunteerAssignment> = {}): VolunteerAssignment => ({
  assignment_id: 'assign-1',
  volunteer_id: 'vol-1',
  event_id: null,
  task_id: null,
  assignment_type: 'general',
  role: null,
  start_time: '2024-06-01T09:00:00Z',
  end_time: null,
  hours_logged: 0,
  status: 'scheduled',
  notes: null,
  ...overrides,
});

const initialState: VolunteersState = {
  volunteers: [],
  currentVolunteer: null,
  assignments: [],
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
  filters: {
    search: '',
    skills: [],
    availability_status: '',
    background_check_status: '',
    is_active: true,
  },
};

// ─── Reducers ─────────────────────────────────────────────────────────────────

describe('volunteersSlice reducers', () => {
  it('setFilters merges partial filter updates', () => {
    const state = reducer(initialState, setFilters({ search: 'driving', availability_status: 'available' }));
    expect(state.filters.search).toBe('driving');
    expect(state.filters.availability_status).toBe('available');
    expect(state.filters.is_active).toBe(true); // untouched
  });

  it('clearFilters resets to initial filter state', () => {
    const dirty = reducer(initialState, setFilters({ search: 'test', skills: ['first_aid'] }));
    const state = reducer(dirty, clearFilters());
    expect(state.filters).toEqual(initialState.filters);
  });

  it('clearCurrentVolunteer sets currentVolunteer to null', () => {
    const withCurrent = { ...initialState, currentVolunteer: makeVolunteer() };
    const state = reducer(withCurrent, clearCurrentVolunteer());
    expect(state.currentVolunteer).toBeNull();
  });

  it('clearError sets error to null', () => {
    const state = reducer({ ...initialState, error: 'Something went wrong' }, clearError());
    expect(state.error).toBeNull();
  });
});

// ─── fetchVolunteers thunk ────────────────────────────────────────────────────

describe('fetchVolunteers thunk', () => {
  it('sets loading=true and clears error on pending', () => {
    const state = reducer({ ...initialState, error: 'old error' }, { type: fetchVolunteers.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates volunteers and pagination on fulfilled', () => {
    const volunteers = [makeVolunteer()];
    const pagination = { total: 1, page: 1, limit: 20, total_pages: 1 };
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchVolunteers.fulfilled.type, payload: { data: volunteers, pagination } }
    );
    expect(state.loading).toBe(false);
    expect(state.volunteers).toHaveLength(1);
    expect(state.pagination.total).toBe(1);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchVolunteers.rejected.type, error: { message: 'Network error' } }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('uses fallback error message when error.message is missing', () => {
    const state = reducer(
      initialState,
      { type: fetchVolunteers.rejected.type, error: {} }
    );
    expect(state.error).toBe('Failed to fetch volunteers');
  });
});

// ─── fetchVolunteerById thunk ─────────────────────────────────────────────────

describe('fetchVolunteerById thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: fetchVolunteerById.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets currentVolunteer on fulfilled', () => {
    const vol = makeVolunteer({ volunteer_id: 'vol-abc' });
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchVolunteerById.fulfilled.type, payload: vol }
    );
    expect(state.loading).toBe(false);
    expect(state.currentVolunteer?.volunteer_id).toBe('vol-abc');
  });

  it('sets error on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchVolunteerById.rejected.type, error: { message: 'Not found' } }
    );
    expect(state.error).toBe('Not found');
  });
});

// ─── fetchVolunteersBySkills thunk ────────────────────────────────────────────

describe('fetchVolunteersBySkills thunk', () => {
  it('replaces entire volunteers list on fulfilled', () => {
    const existing = makeVolunteer({ volunteer_id: 'vol-old' });
    const newVol = makeVolunteer({ volunteer_id: 'vol-new', skills: ['cooking'] });
    const state = reducer(
      { ...initialState, volunteers: [existing] },
      { type: fetchVolunteersBySkills.fulfilled.type, payload: [newVol] }
    );
    expect(state.volunteers).toHaveLength(1);
    expect(state.volunteers[0].volunteer_id).toBe('vol-new');
  });
});

// ─── createVolunteer thunk ────────────────────────────────────────────────────

describe('createVolunteer thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: createVolunteer.pending.type });
    expect(state.loading).toBe(true);
  });

  it('prepends new volunteer to list on fulfilled', () => {
    const existing = makeVolunteer({ volunteer_id: 'vol-old' });
    const created = makeVolunteer({ volunteer_id: 'vol-new' });
    const state = reducer(
      { ...initialState, volunteers: [existing] },
      { type: createVolunteer.fulfilled.type, payload: created }
    );
    expect(state.volunteers[0].volunteer_id).toBe('vol-new');
    expect(state.volunteers).toHaveLength(2);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: createVolunteer.rejected.type, error: { message: 'Validation failed' } }
    );
    expect(state.error).toBe('Validation failed');
  });
});

// ─── updateVolunteer thunk ────────────────────────────────────────────────────

describe('updateVolunteer thunk', () => {
  it('replaces the matching volunteer in the list on fulfilled', () => {
    const original = makeVolunteer({ availability_status: 'available' });
    const updated = makeVolunteer({ availability_status: 'unavailable' });
    const state = reducer(
      { ...initialState, volunteers: [original] },
      { type: updateVolunteer.fulfilled.type, payload: updated }
    );
    expect(state.volunteers[0].availability_status).toBe('unavailable');
  });

  it('also syncs currentVolunteer when IDs match', () => {
    const updated = makeVolunteer({ availability_status: 'limited' });
    const state = reducer(
      { ...initialState, volunteers: [makeVolunteer()], currentVolunteer: makeVolunteer() },
      { type: updateVolunteer.fulfilled.type, payload: updated }
    );
    expect(state.currentVolunteer?.availability_status).toBe('limited');
  });

  it('does not sync currentVolunteer when IDs differ', () => {
    const current = makeVolunteer({ volunteer_id: 'vol-other' });
    const updated = makeVolunteer({ volunteer_id: 'vol-1', availability_status: 'limited' });
    const state = reducer(
      { ...initialState, volunteers: [makeVolunteer()], currentVolunteer: current },
      { type: updateVolunteer.fulfilled.type, payload: updated }
    );
    expect(state.currentVolunteer?.volunteer_id).toBe('vol-other');
  });
});

// ─── deleteVolunteer thunk ────────────────────────────────────────────────────

describe('deleteVolunteer thunk', () => {
  it('removes the volunteer from the list by volunteer_id', () => {
    const second = makeVolunteer({ volunteer_id: 'vol-2' });
    const state = reducer(
      { ...initialState, volunteers: [makeVolunteer(), second] },
      { type: deleteVolunteer.fulfilled.type, payload: 'vol-1' }
    );
    expect(state.volunteers).toHaveLength(1);
    expect(state.volunteers[0].volunteer_id).toBe('vol-2');
  });
});

// ─── fetchVolunteerAssignments thunk ──────────────────────────────────────────

describe('fetchVolunteerAssignments thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: fetchVolunteerAssignments.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets assignments on fulfilled', () => {
    const assignments = [makeAssignment(), makeAssignment({ assignment_id: 'assign-2' })];
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchVolunteerAssignments.fulfilled.type, payload: assignments }
    );
    expect(state.loading).toBe(false);
    expect(state.assignments).toHaveLength(2);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: fetchVolunteerAssignments.rejected.type, error: { message: 'Access denied' } }
    );
    expect(state.error).toBe('Access denied');
  });
});

// ─── createAssignment thunk ───────────────────────────────────────────────────

describe('createAssignment thunk', () => {
  it('prepends new assignment to the list on fulfilled', () => {
    const existing = makeAssignment({ assignment_id: 'assign-old' });
    const created = makeAssignment({ assignment_id: 'assign-new' });
    const state = reducer(
      { ...initialState, assignments: [existing] },
      { type: createAssignment.fulfilled.type, payload: created }
    );
    expect(state.assignments[0].assignment_id).toBe('assign-new');
    expect(state.assignments).toHaveLength(2);
  });
});

// ─── updateAssignment thunk ───────────────────────────────────────────────────

describe('updateAssignment thunk', () => {
  it('replaces the matching assignment by assignment_id', () => {
    const original = makeAssignment({ status: 'scheduled' });
    const updated = makeAssignment({ status: 'completed' });
    const state = reducer(
      { ...initialState, assignments: [original] },
      { type: updateAssignment.fulfilled.type, payload: updated }
    );
    expect(state.assignments[0].status).toBe('completed');
  });

  it('leaves assignments unchanged when assignment_id is not found', () => {
    const existing = makeAssignment({ assignment_id: 'assign-1' });
    const updated = makeAssignment({ assignment_id: 'assign-999', status: 'completed' });
    const state = reducer(
      { ...initialState, assignments: [existing] },
      { type: updateAssignment.fulfilled.type, payload: updated }
    );
    expect(state.assignments[0].status).toBe('scheduled');
  });
});
