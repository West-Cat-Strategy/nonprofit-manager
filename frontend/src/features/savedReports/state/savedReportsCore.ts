/**
 * Saved Reports Redux Slice
 * State management for saved report management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { savedReportsApiClient } from '../api/savedReportsApiClient';
import type {
  CreateSavedReportRequest,
  ReportEntity,
  SavedReportListItem,
  SavedReportsListPage,
  SavedReport,
  UpdateSavedReportRequest,
} from '../types/contracts';

export interface SavedReportsState {
  reports: SavedReportListItem[];
  currentSavedReport: SavedReport | null;
  pagination: SavedReportsListPage['pagination'];
  loading: boolean;
  error: string | null;
}

const initialState: SavedReportsState = {
  reports: [],
  currentSavedReport: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  },
  loading: false,
  error: null,
};

export type FetchSavedReportsArgs =
  | ReportEntity
  | {
      entity?: ReportEntity;
      page?: number;
      limit?: number;
      summary?: boolean;
    }
  | undefined;

const normalizeFetchSavedReportsArgs = (
  args: FetchSavedReportsArgs
): {
  entity?: ReportEntity;
  page?: number;
  limit?: number;
  summary?: boolean;
} => {
  if (!args) {
    return {};
  }
  if (typeof args === 'string') {
    return { entity: args };
  }
  return args;
};

// Async Thunks

/**
 * Fetch all saved reports
 */
export const fetchSavedReports = createAsyncThunk(
  'savedReports/fetchAll',
  async (args?: FetchSavedReportsArgs) => {
    return savedReportsApiClient.fetchSavedReports(normalizeFetchSavedReportsArgs(args));
  }
);

/**
 * Fetch a specific saved report by ID
 */
export const fetchSavedReportById = createAsyncThunk(
  'savedReports/fetchById',
  async (id: string) => {
    return savedReportsApiClient.fetchSavedReportById(id);
  }
);

/**
 * Create a new saved report
 */
export const createSavedReport = createAsyncThunk(
  'savedReports/create',
  async (data: CreateSavedReportRequest) => {
    return savedReportsApiClient.createSavedReport(data);
  }
);

/**
 * Update an existing saved report
 */
export const updateSavedReport = createAsyncThunk(
  'savedReports/update',
  async ({ id, data }: { id: string; data: UpdateSavedReportRequest }) => {
    return savedReportsApiClient.updateSavedReport(id, data);
  }
);

/**
 * Delete a saved report
 */
export const deleteSavedReport = createAsyncThunk(
  'savedReports/delete',
  async (id: string) => {
    await savedReportsApiClient.deleteSavedReport(id);
    return id;
  }
);

// Slice
const savedReportsSlice = createSlice({
  name: 'savedReports',
  initialState,
  reducers: {
    clearCurrentSavedReport: (state) => {
      state.currentSavedReport = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchSavedReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSavedReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch saved reports';
      })
      // Fetch By ID
      .addCase(fetchSavedReportById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSavedReport = action.payload;
      })
      .addCase(fetchSavedReportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch saved report';
      })
      // Create
      .addCase(createSavedReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSavedReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reports.unshift(action.payload);
        state.pagination.total += 1;
        state.pagination.total_pages =
          state.pagination.total === 0 ? 0 : Math.ceil(state.pagination.total / state.pagination.limit);
        state.currentSavedReport = action.payload;
      })
      .addCase(createSavedReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create saved report';
      })
      // Update
      .addCase(updateSavedReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSavedReport.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.reports.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        state.currentSavedReport = action.payload;
      })
      .addCase(updateSavedReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update saved report';
      })
      // Delete
      .addCase(deleteSavedReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSavedReport.fulfilled, (state, action) => {
        state.loading = false;
        const previousLength = state.reports.length;
        state.reports = state.reports.filter((r) => r.id !== action.payload);
        if (state.reports.length < previousLength) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
          state.pagination.total_pages =
            state.pagination.total === 0 ? 0 : Math.ceil(state.pagination.total / state.pagination.limit);
        }
        if (state.currentSavedReport?.id === action.payload) {
          state.currentSavedReport = null;
        }
      })
      .addCase(deleteSavedReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete saved report';
      });
  },
});

export const { clearCurrentSavedReport, clearError } = savedReportsSlice.actions;

export default savedReportsSlice.reducer;
