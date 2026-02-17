import { describe, it, expect } from 'vitest';
import reducer, {
  clearSelectedEvent,
  clearRegistrations,
  clearError,
  fetchEvents,
  fetchEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  fetchEventRegistrations,
  fetchContactRegistrations,
  registerContact,
  updateRegistration,
  checkInAttendee,
  cancelRegistration,
} from '../eventsSlice';
import type { Event, EventRegistration } from '../../../types/event';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    event_id: 'event-1',
    title: 'Annual Gala',
    description: null,
    event_type: 'fundraiser',
    status: 'published',
    start_date: '2024-06-01T18:00:00Z',
    end_date: '2024-06-01T22:00:00Z',
    location: null,
    capacity: 200,
    registered_count: 0,
    attended_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as unknown as Event);

const makeRegistration = (overrides: Partial<EventRegistration> = {}): EventRegistration =>
  ({
    registration_id: 'reg-1',
    event_id: 'event-1',
    contact_id: 'contact-1',
    status: 'registered',
    registered_at: '2024-05-01T10:00:00Z',
    checked_in_at: null,
    ...overrides,
  } as unknown as EventRegistration);

const initialState = {
  events: [] as Event[],
  selectedEvent: null as Event | null,
  registrations: [] as EventRegistration[],
  pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
  loading: false,
  error: null as string | null,
};

// ─── Reducers ─────────────────────────────────────────────────────────────────

describe('eventsSlice reducers', () => {
  it('clearSelectedEvent sets selectedEvent to null', () => {
    const state = reducer({ ...initialState, selectedEvent: makeEvent() }, clearSelectedEvent());
    expect(state.selectedEvent).toBeNull();
  });

  it('clearRegistrations empties registrations array', () => {
    const state = reducer(
      { ...initialState, registrations: [makeRegistration()] },
      clearRegistrations()
    );
    expect(state.registrations).toHaveLength(0);
  });

  it('clearError sets error to null', () => {
    const state = reducer({ ...initialState, error: 'Something broke' }, clearError());
    expect(state.error).toBeNull();
  });
});

// ─── fetchEvents thunk ────────────────────────────────────────────────────────

describe('fetchEvents thunk', () => {
  it('sets loading=true and clears error on pending', () => {
    const state = reducer(
      { ...initialState, error: 'old error' },
      { type: fetchEvents.pending.type }
    );
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates events and pagination on fulfilled', () => {
    const events = [makeEvent()];
    const pagination = { total: 1, page: 1, limit: 20, total_pages: 1 };
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchEvents.fulfilled.type, payload: { data: events, pagination } }
    );
    expect(state.loading).toBe(false);
    expect(state.events).toHaveLength(1);
    expect(state.pagination.total).toBe(1);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchEvents.rejected.type, error: { message: 'Network error' } }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });
});

// ─── fetchEventById thunk ─────────────────────────────────────────────────────

describe('fetchEventById thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: fetchEventById.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets selectedEvent on fulfilled', () => {
    const event = makeEvent({ event_id: 'event-abc' });
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchEventById.fulfilled.type, payload: event }
    );
    expect(state.loading).toBe(false);
    expect(state.selectedEvent?.event_id).toBe('event-abc');
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: fetchEventById.rejected.type, error: { message: 'Not found' } }
    );
    expect(state.error).toBe('Not found');
  });
});

// ─── createEvent thunk ────────────────────────────────────────────────────────

describe('createEvent thunk', () => {
  it('prepends new event to list on fulfilled', () => {
    const existing = makeEvent({ event_id: 'event-old' });
    const created = makeEvent({ event_id: 'event-new' });
    const state = reducer(
      { ...initialState, events: [existing] },
      { type: createEvent.fulfilled.type, payload: created }
    );
    expect(state.events[0].event_id).toBe('event-new');
    expect(state.events).toHaveLength(2);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: createEvent.rejected.type, error: { message: 'Validation error' } }
    );
    expect(state.error).toBe('Validation error');
  });
});

// ─── updateEvent thunk ────────────────────────────────────────────────────────

describe('updateEvent thunk', () => {
  it('replaces the matching event in the list', () => {
    const original = makeEvent({ title: 'Old Title' });
    const updated = makeEvent({ title: 'New Title' });
    const state = reducer(
      { ...initialState, events: [original] },
      { type: updateEvent.fulfilled.type, payload: updated }
    );
    expect(state.events[0].title).toBe('New Title');
  });

  it('also syncs selectedEvent when IDs match', () => {
    const updated = makeEvent({ title: 'Updated Gala' });
    const state = reducer(
      { ...initialState, events: [makeEvent()], selectedEvent: makeEvent() },
      { type: updateEvent.fulfilled.type, payload: updated }
    );
    expect(state.selectedEvent?.title).toBe('Updated Gala');
  });

  it('does not sync selectedEvent when IDs differ', () => {
    const selected = makeEvent({ event_id: 'event-other', title: 'Other Event' });
    const updated = makeEvent({ event_id: 'event-1', title: 'Changed' });
    const state = reducer(
      { ...initialState, events: [makeEvent()], selectedEvent: selected },
      { type: updateEvent.fulfilled.type, payload: updated }
    );
    expect(state.selectedEvent?.title).toBe('Other Event');
  });
});

// ─── deleteEvent thunk ────────────────────────────────────────────────────────

describe('deleteEvent thunk', () => {
  it('removes the event from the list by event_id', () => {
    const second = makeEvent({ event_id: 'event-2' });
    const state = reducer(
      { ...initialState, events: [makeEvent(), second] },
      { type: deleteEvent.fulfilled.type, payload: 'event-1' }
    );
    expect(state.events).toHaveLength(1);
    expect(state.events[0].event_id).toBe('event-2');
  });

  it('clears selectedEvent when the deleted event was selected', () => {
    const state = reducer(
      { ...initialState, events: [makeEvent()], selectedEvent: makeEvent() },
      { type: deleteEvent.fulfilled.type, payload: 'event-1' }
    );
    expect(state.selectedEvent).toBeNull();
  });

  it('leaves selectedEvent intact when a different event is deleted', () => {
    const selected = makeEvent({ event_id: 'event-selected' });
    const state = reducer(
      { ...initialState, events: [makeEvent(), selected], selectedEvent: selected },
      { type: deleteEvent.fulfilled.type, payload: 'event-1' }
    );
    expect(state.selectedEvent?.event_id).toBe('event-selected');
  });
});

// ─── fetchEventRegistrations thunk ────────────────────────────────────────────

describe('fetchEventRegistrations thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: fetchEventRegistrations.pending.type });
    expect(state.loading).toBe(true);
  });

  it('sets registrations on fulfilled', () => {
    const regs = [makeRegistration(), makeRegistration({ registration_id: 'reg-2' })];
    const state = reducer(
      { ...initialState, loading: true },
      { type: fetchEventRegistrations.fulfilled.type, payload: regs }
    );
    expect(state.loading).toBe(false);
    expect(state.registrations).toHaveLength(2);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: fetchEventRegistrations.rejected.type, error: { message: 'Access denied' } }
    );
    expect(state.error).toBe('Access denied');
  });
});

// ─── fetchContactRegistrations thunk ─────────────────────────────────────────

describe('fetchContactRegistrations thunk', () => {
  it('sets registrations on fulfilled', () => {
    const regs = [makeRegistration({ event_id: 'event-x' })];
    const state = reducer(
      initialState,
      { type: fetchContactRegistrations.fulfilled.type, payload: regs }
    );
    expect(state.registrations).toHaveLength(1);
    expect(state.registrations[0].event_id).toBe('event-x');
  });
});

// ─── registerContact thunk ────────────────────────────────────────────────────

describe('registerContact thunk', () => {
  it('prepends new registration to list on fulfilled', () => {
    const existing = makeRegistration({ registration_id: 'reg-old' });
    const created = makeRegistration({ registration_id: 'reg-new' });
    const state = reducer(
      { ...initialState, registrations: [existing] },
      { type: registerContact.fulfilled.type, payload: created }
    );
    expect(state.registrations[0].registration_id).toBe('reg-new');
    expect(state.registrations).toHaveLength(2);
  });

  it('increments selectedEvent.registered_count when event_id matches', () => {
    const reg = makeRegistration({ event_id: 'event-1' });
    const state = reducer(
      { ...initialState, selectedEvent: makeEvent({ registered_count: 5 }) },
      { type: registerContact.fulfilled.type, payload: reg }
    );
    expect(state.selectedEvent?.registered_count).toBe(6);
  });

  it('does not modify registered_count when event_id differs', () => {
    const reg = makeRegistration({ event_id: 'event-other' });
    const state = reducer(
      { ...initialState, selectedEvent: makeEvent({ event_id: 'event-1', registered_count: 3 }) },
      { type: registerContact.fulfilled.type, payload: reg }
    );
    expect(state.selectedEvent?.registered_count).toBe(3);
  });

  it('handles undefined registered_count by starting from 0', () => {
    const reg = makeRegistration({ event_id: 'event-1' });
    const event = makeEvent({ event_id: 'event-1' });
    (event as unknown as Record<string, unknown>).registered_count = undefined;
    const state = reducer(
      { ...initialState, selectedEvent: event },
      { type: registerContact.fulfilled.type, payload: reg }
    );
    expect(state.selectedEvent?.registered_count).toBe(1);
  });
});

// ─── updateRegistration thunk ─────────────────────────────────────────────────

describe('updateRegistration thunk', () => {
  it('replaces the matching registration by registration_id', () => {
    const original = makeRegistration({ status: 'registered' });
    const updated = makeRegistration({ status: 'waitlisted' });
    const state = reducer(
      { ...initialState, registrations: [original] },
      { type: updateRegistration.fulfilled.type, payload: updated }
    );
    expect(state.registrations[0].status).toBe('waitlisted');
  });

  it('leaves registrations unchanged when registration_id is not found', () => {
    const existing = makeRegistration({ registration_id: 'reg-1' });
    const updated = makeRegistration({ registration_id: 'reg-999', status: 'waitlisted' });
    const state = reducer(
      { ...initialState, registrations: [existing] },
      { type: updateRegistration.fulfilled.type, payload: updated }
    );
    expect(state.registrations[0].status).toBe('registered');
  });
});

// ─── checkInAttendee thunk ────────────────────────────────────────────────────

describe('checkInAttendee thunk', () => {
  it('sets loading on pending', () => {
    const state = reducer(initialState, { type: checkInAttendee.pending.type });
    expect(state.loading).toBe(true);
  });

  it('updates the registration in the list when check-in succeeds', () => {
    const original = makeRegistration({ status: 'registered' });
    const checkedIn = makeRegistration({ status: 'attended', checked_in_at: '2024-06-01T18:05:00Z' });
    const checkInResult = { success: true, registration: checkedIn };
    const state = reducer(
      { ...initialState, registrations: [original] },
      { type: checkInAttendee.fulfilled.type, payload: checkInResult }
    );
    expect(state.registrations[0].status).toBe('attended');
  });

  it('increments selectedEvent.attended_count when check-in succeeds', () => {
    const checkedIn = makeRegistration({ event_id: 'event-1', status: 'attended' });
    const checkInResult = { success: true, registration: checkedIn };
    const state = reducer(
      { ...initialState, selectedEvent: makeEvent({ attended_count: 2 }) },
      { type: checkInAttendee.fulfilled.type, payload: checkInResult }
    );
    expect(state.selectedEvent?.attended_count).toBe(3);
  });

  it('does not update state when check-in result has success=false', () => {
    const state = reducer(
      { ...initialState, registrations: [makeRegistration()], selectedEvent: makeEvent({ attended_count: 0 }) },
      { type: checkInAttendee.fulfilled.type, payload: { success: false, registration: null } }
    );
    expect(state.registrations[0].status).toBe('registered');
    expect(state.selectedEvent?.attended_count).toBe(0);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: checkInAttendee.rejected.type, error: { message: 'Already checked in' } }
    );
    expect(state.error).toBe('Already checked in');
  });
});

// ─── cancelRegistration thunk ─────────────────────────────────────────────────

describe('cancelRegistration thunk', () => {
  it('removes the registration from the list', () => {
    const second = makeRegistration({ registration_id: 'reg-2' });
    const state = reducer(
      { ...initialState, registrations: [makeRegistration(), second] },
      { type: cancelRegistration.fulfilled.type, payload: 'reg-1' }
    );
    expect(state.registrations).toHaveLength(1);
    expect(state.registrations[0].registration_id).toBe('reg-2');
  });

  it('decrements selectedEvent.registered_count when event_id matches', () => {
    const reg = makeRegistration({ registration_id: 'reg-1', event_id: 'event-1' });
    const state = reducer(
      { ...initialState, registrations: [reg], selectedEvent: makeEvent({ registered_count: 5 }) },
      { type: cancelRegistration.fulfilled.type, payload: 'reg-1' }
    );
    expect(state.selectedEvent?.registered_count).toBe(4);
  });

  it('clamps registered_count to 0 (Math.max guard)', () => {
    const reg = makeRegistration({ registration_id: 'reg-1', event_id: 'event-1' });
    const state = reducer(
      { ...initialState, registrations: [reg], selectedEvent: makeEvent({ registered_count: 0 }) },
      { type: cancelRegistration.fulfilled.type, payload: 'reg-1' }
    );
    expect(state.selectedEvent?.registered_count).toBe(0);
  });

  it('does not modify registered_count when cancelled registration belongs to a different event', () => {
    const reg = makeRegistration({ registration_id: 'reg-1', event_id: 'event-other' });
    const state = reducer(
      {
        ...initialState,
        registrations: [reg],
        selectedEvent: makeEvent({ event_id: 'event-1', registered_count: 3 }),
      },
      { type: cancelRegistration.fulfilled.type, payload: 'reg-1' }
    );
    expect(state.selectedEvent?.registered_count).toBe(3);
  });

  it('sets error on rejected', () => {
    const state = reducer(
      initialState,
      { type: cancelRegistration.rejected.type, error: { message: 'Cannot cancel' } }
    );
    expect(state.error).toBe('Cannot cancel');
  });
});
