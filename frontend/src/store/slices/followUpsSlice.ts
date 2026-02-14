/**
 * Follow-ups Redux Slice
 * State management for scheduleable follow-ups on cases and tasks
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  FollowUp,
  FollowUpWithEntity,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  CompleteFollowUpDTO,
  FollowUpFilters,
  FollowUpSummary,
  FollowUpEntityType,
} from '../../types/followup';

interface FollowUpsState {
  // All follow-ups (for list views)
  followUps: FollowUpWithEntity[];
  // Follow-ups for current entity (case or task)
  entityFollowUps: FollowUp[];
  // Selected follow-up for detail view
  selectedFollowUp: FollowUp | null;
  // Summary stats
  summary: FollowUpSummary | null;
  // Upcoming follow-ups (for dashboard widget)
  upcoming: FollowUpWithEntity[];
  // Loading states
  loading: boolean;
  entityLoading: boolean;
  // Error state
  error: string | null;
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  // Current filters
  filters: FollowUpFilters;
}

const initialState: FollowUpsState = {
  followUps: [],
  entityFollowUps: [],
  selectedFollowUp: null,
  summary: null,
  upcoming: [],
  loading: false,
  entityLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {},
};

// Fetch all follow-ups with filters
export const fetchFollowUps = createAsyncThunk(
  'followUps/fetchFollowUps',
  async (params: { filters?: FollowUpFilters; page?: number; limit?: number } = {}) => {
    const queryParams = new URLSearchParams();

    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const response = await api.get<{
      data: FollowUpWithEntity[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`/follow-ups?${queryParams.toString()}`);
    return response.data;
  }
);

// Fetch follow-ups for a specific entity (case or task)
export const fetchEntityFollowUps = createAsyncThunk(
  'followUps/fetchEntityFollowUps',
  async ({ entityType, entityId }: { entityType: FollowUpEntityType; entityId: string }) => {
    const response = await api.get<FollowUp[]>(`/${entityType}s/${entityId}/follow-ups`);
    return response.data;
  }
);

// Fetch a single follow-up by ID
export const fetchFollowUpById = createAsyncThunk(
  'followUps/fetchFollowUpById',
  async (followUpId: string) => {
    const response = await api.get<FollowUp>(`/follow-ups/${followUpId}`);
    return response.data;
  }
);

// Create a new follow-up
export const createFollowUp = createAsyncThunk(
  'followUps/createFollowUp',
  async (data: CreateFollowUpDTO) => {
    const response = await api.post<FollowUp>(`/follow-ups`, data);
    return response.data;
  }
);

// Update a follow-up
export const updateFollowUp = createAsyncThunk(
  'followUps/updateFollowUp',
  async ({ followUpId, data }: { followUpId: string; data: UpdateFollowUpDTO }) => {
    const response = await api.put<FollowUp>(`/follow-ups/${followUpId}`, data);
    return response.data;
  }
);

// Complete a follow-up
export const completeFollowUp = createAsyncThunk(
  'followUps/completeFollowUp',
  async ({ followUpId, data }: { followUpId: string; data?: CompleteFollowUpDTO }) => {
    const response = await api.post<FollowUp>(`/follow-ups/${followUpId}/complete`, data || {});
    return response.data;
  }
);

// Cancel a follow-up
export const cancelFollowUp = createAsyncThunk(
  'followUps/cancelFollowUp',
  async (followUpId: string) => {
    const response = await api.post<FollowUp>(`/follow-ups/${followUpId}/cancel`);
    return response.data;
  }
);

// Reschedule a follow-up
export const rescheduleFollowUp = createAsyncThunk(
  'followUps/rescheduleFollowUp',
  async ({ followUpId, newDate, newTime }: { followUpId: string; newDate: string; newTime?: string }) => {
    const response = await api.post<FollowUp>(`/follow-ups/${followUpId}/reschedule`, {
      scheduled_date: newDate,
      scheduled_time: newTime,
    });
    return response.data;
  }
);

// Delete a follow-up
export const deleteFollowUp = createAsyncThunk(
  'followUps/deleteFollowUp',
  async (followUpId: string) => {
    await api.delete(`/follow-ups/${followUpId}`);
    return followUpId;
  }
);

// Fetch follow-up summary
export const fetchFollowUpSummary = createAsyncThunk(
  'followUps/fetchFollowUpSummary',
  async (filters?: FollowUpFilters) => {
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const response = await api.get<FollowUpSummary>(`/follow-ups/summary?${queryParams.toString()}`);
    return response.data;
  }
);

// Fetch upcoming follow-ups (for dashboard)
export const fetchUpcomingFollowUps = createAsyncThunk(
  'followUps/fetchUpcomingFollowUps',
  async (limit: number = 10) => {
    const response = await api.get<FollowUpWithEntity[]>(`/follow-ups/upcoming?limit=${limit}`);
    return response.data;
  }
);

const followUpsSlice = createSlice({
  name: 'followUps',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<FollowUpFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearEntityFollowUps: (state) => {
      state.entityFollowUps = [];
    },
    clearSelectedFollowUp: (state) => {
      state.selectedFollowUp = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all follow-ups
    builder
      .addCase(fetchFollowUps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowUps.fulfilled, (state, action) => {
        state.loading = false;
        state.followUps = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchFollowUps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch follow-ups';
      })

    // Fetch entity follow-ups
      .addCase(fetchEntityFollowUps.pending, (state) => {
        state.entityLoading = true;
        state.error = null;
      })
      .addCase(fetchEntityFollowUps.fulfilled, (state, action) => {
        state.entityLoading = false;
        state.entityFollowUps = action.payload;
      })
      .addCase(fetchEntityFollowUps.rejected, (state, action) => {
        state.entityLoading = false;
        state.error = action.error.message || 'Failed to fetch follow-ups';
      })

    // Fetch single follow-up
      .addCase(fetchFollowUpById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowUpById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedFollowUp = action.payload;
      })
      .addCase(fetchFollowUpById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch follow-up';
      })

    // Create follow-up
      .addCase(createFollowUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFollowUp.fulfilled, (state, action) => {
        state.loading = false;
        state.entityFollowUps.unshift(action.payload);
        state.followUps.unshift(action.payload as FollowUpWithEntity);
      })
      .addCase(createFollowUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create follow-up';
      })

    // Update follow-up
      .addCase(updateFollowUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFollowUp.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        // Update in entity follow-ups
        const entityIndex = state.entityFollowUps.findIndex(f => f.id === updated.id);
        if (entityIndex !== -1) {
          state.entityFollowUps[entityIndex] = updated;
        }
        // Update in all follow-ups
        const allIndex = state.followUps.findIndex(f => f.id === updated.id);
        if (allIndex !== -1) {
          state.followUps[allIndex] = { ...state.followUps[allIndex], ...updated };
        }
        // Update selected
        if (state.selectedFollowUp?.id === updated.id) {
          state.selectedFollowUp = updated;
        }
      })
      .addCase(updateFollowUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update follow-up';
      })

    // Complete follow-up
      .addCase(completeFollowUp.fulfilled, (state, action) => {
        const completed = action.payload;
        // Update in entity follow-ups
        const entityIndex = state.entityFollowUps.findIndex(f => f.id === completed.id);
        if (entityIndex !== -1) {
          state.entityFollowUps[entityIndex] = completed;
        }
        // Update in all follow-ups
        const allIndex = state.followUps.findIndex(f => f.id === completed.id);
        if (allIndex !== -1) {
          state.followUps[allIndex] = { ...state.followUps[allIndex], ...completed };
        }
      })

    // Cancel follow-up
      .addCase(cancelFollowUp.fulfilled, (state, action) => {
        const cancelled = action.payload;
        // Update in entity follow-ups
        const entityIndex = state.entityFollowUps.findIndex(f => f.id === cancelled.id);
        if (entityIndex !== -1) {
          state.entityFollowUps[entityIndex] = cancelled;
        }
        // Update in all follow-ups
        const allIndex = state.followUps.findIndex(f => f.id === cancelled.id);
        if (allIndex !== -1) {
          state.followUps[allIndex] = { ...state.followUps[allIndex], ...cancelled };
        }
      })

    // Reschedule follow-up
      .addCase(rescheduleFollowUp.fulfilled, (state, action) => {
        const rescheduled = action.payload;
        // Update in entity follow-ups
        const entityIndex = state.entityFollowUps.findIndex(f => f.id === rescheduled.id);
        if (entityIndex !== -1) {
          state.entityFollowUps[entityIndex] = rescheduled;
        }
        // Update in all follow-ups
        const allIndex = state.followUps.findIndex(f => f.id === rescheduled.id);
        if (allIndex !== -1) {
          state.followUps[allIndex] = { ...state.followUps[allIndex], ...rescheduled };
        }
      })

    // Delete follow-up
      .addCase(deleteFollowUp.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.entityFollowUps = state.entityFollowUps.filter(f => f.id !== deletedId);
        state.followUps = state.followUps.filter(f => f.id !== deletedId);
        if (state.selectedFollowUp?.id === deletedId) {
          state.selectedFollowUp = null;
        }
      })

    // Fetch summary
      .addCase(fetchFollowUpSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })

    // Fetch upcoming
      .addCase(fetchUpcomingFollowUps.fulfilled, (state, action) => {
        state.upcoming = action.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  clearEntityFollowUps,
  clearSelectedFollowUp,
  clearError,
} = followUpsSlice.actions;

export default followUpsSlice.reducer;

// Selectors
const selectFollowUpsState = (state: { followUps: FollowUpsState }) => state.followUps;
const selectEntityFollowUpsArray = createSelector(
  [selectFollowUpsState],
  (state) => state.entityFollowUps
);

export const selectEntityFollowUps = selectEntityFollowUpsArray;

export const selectScheduledFollowUps = createSelector(
  [selectEntityFollowUpsArray],
  (followUps) => followUps.filter(f => f.status === 'scheduled')
);

export const selectOverdueFollowUps = createSelector(
  [selectEntityFollowUpsArray],
  (followUps) => followUps.filter(f => f.status === 'overdue')
);

export const selectCompletedFollowUps = createSelector(
  [selectEntityFollowUpsArray],
  (followUps) => followUps.filter(f => f.status === 'completed')
);
