/**
 * Events Redux Slice
 * State management for event and registration data
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  Event,
  CreateEventDTO,
  UpdateEventDTO,
  EventFilters,
  PaginationParams,
  PaginatedEvents,
  EventRegistration,
  CreateRegistrationDTO,
  UpdateRegistrationDTO,
  RegistrationFilters,
  CheckInResult,
} from '../../types/event';
import api from '../../services/api';

interface EventsState {
  events: Event[];
  selectedEvent: Event | null;
  registrations: EventRegistration[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  selectedEvent: null,
  registrations: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  loading: false,
  error: null,
};

// Event async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (params: { filters?: EventFilters; pagination?: PaginationParams }) => {
    const queryParams = new URLSearchParams();

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    if (params.pagination) {
      Object.entries(params.pagination).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const response = await api.get<PaginatedEvents>(`/events?${queryParams.toString()}`);
    return response.data;
  }
);

export const fetchEventById = createAsyncThunk('events/fetchEventById', async (eventId: string) => {
  const response = await api.get<Event>(`/events/${eventId}`);
  return response.data;
});

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: CreateEventDTO) => {
    const response = await api.post<Event>('/events', eventData);
    return response.data;
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, eventData }: { eventId: string; eventData: UpdateEventDTO }) => {
    const response = await api.put<Event>(`/events/${eventId}`, eventData);
    return response.data;
  }
);

export const deleteEvent = createAsyncThunk('events/deleteEvent', async (eventId: string) => {
  await api.delete(`/events/${eventId}`);
  return eventId;
});

// Registration async thunks
export const fetchEventRegistrations = createAsyncThunk(
  'events/fetchEventRegistrations',
  async ({ eventId, filters }: { eventId: string; filters?: RegistrationFilters }) => {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const response = await api.get<EventRegistration[]>(
      `/events/${eventId}/registrations?${queryParams.toString()}`
    );
    return response.data;
  }
);

export const fetchContactRegistrations = createAsyncThunk(
  'events/fetchContactRegistrations',
  async (contactId: string) => {
    const response = await api.get<EventRegistration[]>(
      `/events/registrations?contact_id=${encodeURIComponent(contactId)}`
    );
    return response.data;
  }
);

export const registerContact = createAsyncThunk(
  'events/registerContact',
  async (registrationData: CreateRegistrationDTO) => {
    const response = await api.post<EventRegistration>(
      `/events/${registrationData.event_id}/register`,
      {
        contact_id: registrationData.contact_id,
        registration_status: registrationData.registration_status,
        notes: registrationData.notes,
      }
    );
    return response.data;
  }
);

export const updateRegistration = createAsyncThunk(
  'events/updateRegistration',
  async ({
    registrationId,
    updateData,
  }: {
    registrationId: string;
    updateData: UpdateRegistrationDTO;
  }) => {
    const response = await api.put<EventRegistration>(
      `/events/registrations/${registrationId}`,
      updateData
    );
    return response.data;
  }
);

export const checkInAttendee = createAsyncThunk(
  'events/checkInAttendee',
  async (registrationId: string) => {
    const response = await api.post<CheckInResult>(
      `/events/registrations/${registrationId}/check-in`
    );
    return response.data;
  }
);

export const cancelRegistration = createAsyncThunk(
  'events/cancelRegistration',
  async (registrationId: string) => {
    await api.delete(`/events/registrations/${registrationId}`);
    return registrationId;
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearSelectedEvent: (state) => {
      state.selectedEvent = null;
    },
    clearRegistrations: (state) => {
      state.registrations = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch events
    builder.addCase(fetchEvents.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action: PayloadAction<PaginatedEvents>) => {
      state.loading = false;
      state.events = action.payload.data;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchEvents.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch events';
    });

    // Fetch event by ID
    builder.addCase(fetchEventById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEventById.fulfilled, (state, action: PayloadAction<Event>) => {
      state.loading = false;
      state.selectedEvent = action.payload;
    });
    builder.addCase(fetchEventById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch event';
    });

    // Create event
    builder.addCase(createEvent.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createEvent.fulfilled, (state, action: PayloadAction<Event>) => {
      state.loading = false;
      state.events.unshift(action.payload);
    });
    builder.addCase(createEvent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create event';
    });

    // Update event
    builder.addCase(updateEvent.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateEvent.fulfilled, (state, action: PayloadAction<Event>) => {
      state.loading = false;
      const index = state.events.findIndex((e) => e.event_id === action.payload.event_id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      if (state.selectedEvent?.event_id === action.payload.event_id) {
        state.selectedEvent = action.payload;
      }
    });
    builder.addCase(updateEvent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update event';
    });

    // Delete event
    builder.addCase(deleteEvent.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteEvent.fulfilled, (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.events = state.events.filter((e) => e.event_id !== action.payload);
      if (state.selectedEvent?.event_id === action.payload) {
        state.selectedEvent = null;
      }
    });
    builder.addCase(deleteEvent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete event';
    });

    // Fetch event registrations
    builder.addCase(fetchEventRegistrations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      fetchEventRegistrations.fulfilled,
      (state, action: PayloadAction<EventRegistration[]>) => {
        state.loading = false;
        state.registrations = action.payload;
      }
    );
    builder.addCase(fetchEventRegistrations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch registrations';
    });

    // Fetch contact registrations
    builder.addCase(fetchContactRegistrations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      fetchContactRegistrations.fulfilled,
      (state, action: PayloadAction<EventRegistration[]>) => {
        state.loading = false;
        state.registrations = action.payload;
      }
    );
    builder.addCase(fetchContactRegistrations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch contact registrations';
    });

    // Register contact
    builder.addCase(registerContact.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      registerContact.fulfilled,
      (state, action: PayloadAction<EventRegistration>) => {
        state.loading = false;
        state.registrations.unshift(action.payload);

        // Update event's registered_count
        if (state.selectedEvent?.event_id === action.payload.event_id) {
          state.selectedEvent.registered_count = (state.selectedEvent.registered_count || 0) + 1;
        }
      }
    );
    builder.addCase(registerContact.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to register contact';
    });

    // Update registration
    builder.addCase(updateRegistration.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      updateRegistration.fulfilled,
      (state, action: PayloadAction<EventRegistration>) => {
        state.loading = false;
        const index = state.registrations.findIndex(
          (r) => r.registration_id === action.payload.registration_id
        );
        if (index !== -1) {
          state.registrations[index] = action.payload;
        }
      }
    );
    builder.addCase(updateRegistration.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update registration';
    });

    // Check in attendee
    builder.addCase(checkInAttendee.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(checkInAttendee.fulfilled, (state, action: PayloadAction<CheckInResult>) => {
      state.loading = false;
      if (action.payload.success && action.payload.registration) {
        const index = state.registrations.findIndex(
          (r) => r.registration_id === action.payload.registration?.registration_id
        );
        if (index !== -1) {
          state.registrations[index] = action.payload.registration;
        }

        // Update event's attended_count
        if (state.selectedEvent?.event_id === action.payload.registration.event_id) {
          state.selectedEvent.attended_count = (state.selectedEvent.attended_count || 0) + 1;
        }
      }
    });
    builder.addCase(checkInAttendee.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to check in attendee';
    });

    // Cancel registration
    builder.addCase(cancelRegistration.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelRegistration.fulfilled, (state, action: PayloadAction<string>) => {
      state.loading = false;
      const registration = state.registrations.find((r) => r.registration_id === action.payload);
      state.registrations = state.registrations.filter((r) => r.registration_id !== action.payload);

      // Update event's registered_count
      if (registration && state.selectedEvent?.event_id === registration.event_id) {
        state.selectedEvent.registered_count = Math.max(
          (state.selectedEvent.registered_count || 1) - 1,
          0
        );
      }
    });
    builder.addCase(cancelRegistration.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to cancel registration';
    });
  },
});

export const { clearSelectedEvent, clearRegistrations, clearError } = eventsSlice.actions;
export default eventsSlice.reducer;
