import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { EventReminderSummary } from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';

interface EventRemindersState {
  sending: boolean;
  lastSummary: EventReminderSummary | null;
  error: string | null;
}

const initialState: EventRemindersState = {
  sending: false,
  lastSummary: null,
  error: null,
};

export const sendEventRemindersV2 = createAsyncThunk(
  'eventRemindersV2/send',
  async ({
    eventId,
    payload,
  }: {
    eventId: string;
    payload: {
      sendEmail?: boolean;
      sendSms?: boolean;
      customMessage?: string;
    };
  }) => eventsApiClient.sendManualReminders(eventId, payload)
);

const eventRemindersSlice = createSlice({
  name: 'eventRemindersV2',
  initialState,
  reducers: {
    clearEventRemindersStateV2: (state) => {
      state.lastSummary = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(sendEventRemindersV2.pending, (state) => {
      state.sending = true;
      state.error = null;
    });
    builder.addCase(sendEventRemindersV2.fulfilled, (state, action) => {
      state.sending = false;
      state.lastSummary = action.payload;
    });
    builder.addCase(sendEventRemindersV2.rejected, (state, action) => {
      state.sending = false;
      state.error = action.error.message ?? 'Failed to send reminders';
    });
  },
});

export const { clearEventRemindersStateV2 } = eventRemindersSlice.actions;
export default eventRemindersSlice.reducer;
