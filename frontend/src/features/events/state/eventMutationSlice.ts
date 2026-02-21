import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CreateEventDTO, Event, UpdateEventDTO } from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';

interface EventMutationState {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  lastCreatedEvent: Event | null;
  lastUpdatedEvent: Event | null;
  lastDeletedEventId: string | null;
  error: string | null;
}

const initialState: EventMutationState = {
  creating: false,
  updating: false,
  deleting: false,
  lastCreatedEvent: null,
  lastUpdatedEvent: null,
  lastDeletedEventId: null,
  error: null,
};

export const createEventV2 = createAsyncThunk('eventMutationV2/create', async (payload: CreateEventDTO) => {
  return eventsApiClient.createEvent(payload);
});

export const updateEventV2 = createAsyncThunk(
  'eventMutationV2/update',
  async ({ eventId, eventData }: { eventId: string; eventData: UpdateEventDTO }) => {
    return eventsApiClient.updateEvent(eventId, eventData);
  }
);

export const deleteEventV2 = createAsyncThunk('eventMutationV2/delete', async (eventId: string) => {
  await eventsApiClient.deleteEvent(eventId);
  return eventId;
});

const eventMutationSlice = createSlice({
  name: 'eventMutationV2',
  initialState,
  reducers: {
    clearEventMutationStateV2: (state) => {
      state.lastCreatedEvent = null;
      state.lastUpdatedEvent = null;
      state.lastDeletedEventId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createEventV2.pending, (state) => {
      state.creating = true;
      state.error = null;
    });
    builder.addCase(createEventV2.fulfilled, (state, action) => {
      state.creating = false;
      state.lastCreatedEvent = action.payload;
    });
    builder.addCase(createEventV2.rejected, (state, action) => {
      state.creating = false;
      state.error = action.error.message ?? 'Failed to create event';
    });

    builder.addCase(updateEventV2.pending, (state) => {
      state.updating = true;
      state.error = null;
    });
    builder.addCase(updateEventV2.fulfilled, (state, action) => {
      state.updating = false;
      state.lastUpdatedEvent = action.payload;
    });
    builder.addCase(updateEventV2.rejected, (state, action) => {
      state.updating = false;
      state.error = action.error.message ?? 'Failed to update event';
    });

    builder.addCase(deleteEventV2.pending, (state) => {
      state.deleting = true;
      state.error = null;
    });
    builder.addCase(deleteEventV2.fulfilled, (state, action) => {
      state.deleting = false;
      state.lastDeletedEventId = action.payload;
    });
    builder.addCase(deleteEventV2.rejected, (state, action) => {
      state.deleting = false;
      state.error = action.error.message ?? 'Failed to delete event';
    });
  },
});

export const { clearEventMutationStateV2 } = eventMutationSlice.actions;
export default eventMutationSlice.reducer;
