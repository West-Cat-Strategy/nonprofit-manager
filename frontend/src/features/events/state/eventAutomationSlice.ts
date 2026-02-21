import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  CreateEventReminderAutomationDTO,
  EventReminderAutomation,
  SyncEventReminderAutomationsDTO,
} from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';

interface EventAutomationState {
  automations: EventReminderAutomation[];
  loading: boolean;
  creating: boolean;
  cancelling: boolean;
  syncing: boolean;
  lastCancelledAutomationId: string | null;
  error: string | null;
}

const initialState: EventAutomationState = {
  automations: [],
  loading: false,
  creating: false,
  cancelling: false,
  syncing: false,
  lastCancelledAutomationId: null,
  error: null,
};

export const fetchEventAutomationsV2 = createAsyncThunk(
  'eventAutomationV2/fetch',
  async (eventId: string) => eventsApiClient.listReminderAutomations(eventId)
);

export const createEventAutomationV2 = createAsyncThunk(
  'eventAutomationV2/create',
  async ({ eventId, payload }: { eventId: string; payload: CreateEventReminderAutomationDTO }) => {
    return eventsApiClient.createReminderAutomation(eventId, payload);
  }
);

export const cancelEventAutomationV2 = createAsyncThunk(
  'eventAutomationV2/cancel',
  async ({ eventId, automationId }: { eventId: string; automationId: string }) => {
    await eventsApiClient.cancelReminderAutomation(eventId, automationId);
    return automationId;
  }
);

export const syncEventAutomationsV2 = createAsyncThunk(
  'eventAutomationV2/sync',
  async ({ eventId, payload }: { eventId: string; payload: SyncEventReminderAutomationsDTO }) => {
    await eventsApiClient.syncReminderAutomations(eventId, payload);
    return eventId;
  }
);

const eventAutomationSlice = createSlice({
  name: 'eventAutomationV2',
  initialState,
  reducers: {
    clearEventAutomationStateV2: (state) => {
      state.error = null;
      state.lastCancelledAutomationId = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchEventAutomationsV2.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchEventAutomationsV2.fulfilled, (state, action) => {
      state.loading = false;
      state.automations = action.payload;
    });
    builder.addCase(fetchEventAutomationsV2.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message ?? 'Failed to load reminder automations';
    });

    builder.addCase(createEventAutomationV2.pending, (state) => {
      state.creating = true;
      state.error = null;
    });
    builder.addCase(createEventAutomationV2.fulfilled, (state, action) => {
      state.creating = false;
      state.automations.unshift(action.payload);
    });
    builder.addCase(createEventAutomationV2.rejected, (state, action) => {
      state.creating = false;
      state.error = action.error.message ?? 'Failed to create reminder automation';
    });

    builder.addCase(cancelEventAutomationV2.pending, (state) => {
      state.cancelling = true;
      state.error = null;
    });
    builder.addCase(cancelEventAutomationV2.fulfilled, (state, action) => {
      state.cancelling = false;
      state.lastCancelledAutomationId = action.payload;
      state.automations = state.automations.map((item) =>
        item.id === action.payload ? { ...item, is_active: false, attempt_status: 'cancelled' } : item
      );
    });
    builder.addCase(cancelEventAutomationV2.rejected, (state, action) => {
      state.cancelling = false;
      state.error = action.error.message ?? 'Failed to cancel reminder automation';
    });

    builder.addCase(syncEventAutomationsV2.pending, (state) => {
      state.syncing = true;
      state.error = null;
    });
    builder.addCase(syncEventAutomationsV2.fulfilled, (state) => {
      state.syncing = false;
    });
    builder.addCase(syncEventAutomationsV2.rejected, (state, action) => {
      state.syncing = false;
      state.error = action.error.message ?? 'Failed to sync reminder automations';
    });
  },
});

export const { clearEventAutomationStateV2 } = eventAutomationSlice.actions;
export default eventAutomationSlice.reducer;
