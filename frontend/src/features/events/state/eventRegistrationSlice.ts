import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { EventRegistration } from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';

interface EventRegistrationState {
  registrations: EventRegistration[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: EventRegistrationState = {
  registrations: [],
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchEventRegistrationsV2 = createAsyncThunk(
  'eventRegistrationV2/fetch',
  async (eventId: string) => eventsApiClient.listEventRegistrations(eventId)
);

export const checkInRegistrationV2 = createAsyncThunk(
  'eventRegistrationV2/checkIn',
  async (registrationId: string) => eventsApiClient.checkInRegistration(registrationId)
);

export const cancelEventRegistrationV2 = createAsyncThunk(
  'eventRegistrationV2/cancel',
  async (registrationId: string) => {
    await eventsApiClient.cancelRegistration(registrationId);
    return registrationId;
  }
);

const eventRegistrationSlice = createSlice({
  name: 'eventRegistrationV2',
  initialState,
  reducers: {
    clearEventRegistrationsV2: (state) => {
      state.registrations = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchEventRegistrationsV2.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEventRegistrationsV2.fulfilled, (state, action) => {
      state.loading = false;
      state.registrations = action.payload;
    });
    builder.addCase(fetchEventRegistrationsV2.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? 'Failed to load registrations';
    });

    builder.addCase(checkInRegistrationV2.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(checkInRegistrationV2.fulfilled, (state, action) => {
      state.actionLoading = false;
      const index = state.registrations.findIndex(
        (item) => item.registration_id === action.payload.registration_id
      );
      if (index !== -1) {
        state.registrations[index] = action.payload;
      }
    });
    builder.addCase(checkInRegistrationV2.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.error.message ?? 'Failed to check in attendee';
    });

    builder.addCase(cancelEventRegistrationV2.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(cancelEventRegistrationV2.fulfilled, (state, action) => {
      state.actionLoading = false;
      state.registrations = state.registrations.filter(
        (item) => item.registration_id !== action.payload
      );
    });
    builder.addCase(cancelEventRegistrationV2.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.error.message ?? 'Failed to cancel registration';
    });
  },
});

export const { clearEventRegistrationsV2 } = eventRegistrationSlice.actions;
export default eventRegistrationSlice.reducer;
