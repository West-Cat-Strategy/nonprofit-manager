import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Event, PaginatedEvents } from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';
import type { EventListQuery } from '../types/contracts';
import { createEventV2, deleteEventV2, updateEventV2 } from './eventMutationSlice';

interface EventsListState {
  events: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const initialState: EventsListState = {
  events: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  loading: false,
  error: null,
};

export const fetchEventsListV2 = createAsyncThunk(
  'eventsListV2/fetch',
  async (query: EventListQuery = {}) => {
    const data = await eventsApiClient.listEvents({
      page: 1,
      limit: 20,
      ...query,
    });
    return data;
  }
);

const eventsListSlice = createSlice({
  name: 'eventsListV2',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchEventsListV2.pending, (listState) => {
      listState.loading = true;
      listState.error = null;
    });
    builder.addCase(fetchEventsListV2.fulfilled, (listState, action: { payload: PaginatedEvents }) => {
      const payload = action.payload as Partial<PaginatedEvents>;
      const pagination = payload.pagination ?? {
        total: 0,
        page: 1,
        limit: listState.limit,
        total_pages: 0,
      };

      listState.loading = false;
      listState.events = Array.isArray(payload.data) ? payload.data : [];
      listState.total = pagination.total ?? 0;
      listState.page = pagination.page ?? 1;
      listState.limit = pagination.limit ?? listState.limit;
      listState.totalPages = pagination.total_pages ?? 0;
    });
    builder.addCase(fetchEventsListV2.rejected, (listState, action) => {
      listState.loading = false;
      listState.error = action.error.message ?? 'Failed to load events';
    });
    builder.addCase(createEventV2.fulfilled, (listState, action) => {
      listState.events.unshift(action.payload);
      listState.total += 1;
    });
    builder.addCase(updateEventV2.fulfilled, (listState, action) => {
      const index = listState.events.findIndex((event) => event.event_id === action.payload.event_id);
      if (index !== -1) {
        listState.events[index] = action.payload;
      }
    });
    builder.addCase(deleteEventV2.fulfilled, (listState, action) => {
      listState.events = listState.events.filter((event) => event.event_id !== action.payload);
      listState.total = Math.max(0, listState.total - 1);
    });
  },
});

export default eventsListSlice.reducer;
