import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Event } from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';
import { deleteEventV2, updateEventV2 } from './eventMutationSlice';

interface EventDetailState {
  event: Event | null;
  loading: boolean;
  error: string | null;
}

const initialState: EventDetailState = {
  event: null,
  loading: false,
  error: null,
};

export const fetchEventDetailV2 = createAsyncThunk('eventDetailV2/fetch', async (eventId: string) => {
  return eventsApiClient.getEventById(eventId);
});

const eventDetailSlice = createSlice({
  name: 'eventDetailV2',
  initialState,
  reducers: {
    clearEventDetailV2: (state) => {
      state.event = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchEventDetailV2.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEventDetailV2.fulfilled, (state, action) => {
      state.loading = false;
      state.event = action.payload;
    });
    builder.addCase(fetchEventDetailV2.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? 'Failed to load event details';
    });
    builder.addCase(updateEventV2.fulfilled, (state, action) => {
      if (state.event?.event_id === action.payload.event_id) {
        state.event = action.payload;
      }
    });
    builder.addCase(deleteEventV2.fulfilled, (state, action) => {
      if (state.event?.event_id === action.payload) {
        state.event = null;
      }
    });
  },
});

export const { clearEventDetailV2 } = eventDetailSlice.actions;
export default eventDetailSlice.reducer;
