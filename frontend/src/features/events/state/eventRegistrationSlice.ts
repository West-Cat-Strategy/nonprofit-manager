import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { EventRegistration, RegistrationFilters, UpdateRegistrationDTO } from '../../../types/event';
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
  async (
    args:
      | string
      | {
          eventId: string;
          filters?: RegistrationFilters;
        }
  ) =>
    typeof args === 'string'
      ? eventsApiClient.listEventRegistrations(args)
      : eventsApiClient.listEventRegistrations(args.eventId, args.filters)
);

export const checkInRegistrationV2 = createAsyncThunk(
  'eventRegistrationV2/checkIn',
  async (registrationId: string) => eventsApiClient.checkInRegistration(registrationId)
);

export const updateEventRegistrationV2 = createAsyncThunk(
  'eventRegistrationV2/update',
  async (args: { registrationId: string; payload: UpdateRegistrationDTO }) =>
    eventsApiClient.updateRegistration(args.registrationId, args.payload)
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

    builder.addCase(updateEventRegistrationV2.pending, (state) => {
      state.actionLoading = true;
      state.error = null;
    });
    builder.addCase(updateEventRegistrationV2.fulfilled, (state, action) => {
      state.actionLoading = false;
      const index = state.registrations.findIndex(
        (item) => item.registration_id === action.payload.registration_id
      );
      if (index !== -1) {
        state.registrations[index] = {
          ...state.registrations[index],
          ...action.payload,
        };
      }
    });
    builder.addCase(updateEventRegistrationV2.rejected, (state, action) => {
      state.actionLoading = false;
      state.error = action.error.message ?? 'Failed to update registration';
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
