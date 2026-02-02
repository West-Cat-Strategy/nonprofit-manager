/**
 * Saved Reports Redux Slice
 * State management for saved report management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { SavedReport, CreateSavedReportRequest, UpdateSavedReportRequest } from '../../types/savedReport';
import type { ReportEntity } from '../../types/report';

export interface SavedReportsState {
  reports: SavedReport[];
  currentSavedReport: SavedReport | null;
  loading: boolean;
  error: string | null;
}

const initialState: SavedReportsState = {
  reports: [],
  currentSavedReport: null,
  loading: false,
  error: null,
};

// Async Thunks

/**
 * Fetch all saved reports
 */
export const fetchSavedReports = createAsyncThunk(
  'savedReports/fetchAll',
  async (entity?: ReportEntity) => {
    const url = entity ? `/saved-reports?entity=${entity}` : '/saved-reports';
    const response = await api.get(url);
    return response.data;
  }
);

/**
 * Fetch a specific saved report by ID
 */
export const fetchSavedReportById = createAsyncThunk(
  'savedReports/fetchById',
  async (id: string) => {
    const response = await api.get(`/saved-reports/${id}`);
    return response.data;
  }
);

/**
 * Create a new saved report
 */
export const createSavedReport = createAsyncThunk(
  'savedReports/create',
  async (data: CreateSavedReportRequest) => {
    const response = await api.post('/saved-reports', data);
    return response.data;
  }
);

/**
 * Update an existing saved report
 */
export const updateSavedReport = createAsyncThunk(
  'savedReports/update',
  async ({ id, data }: { id: string; data: UpdateSavedReportRequest }) => {
    const response = await api.put(`/saved-reports/${id}`, data);
    return response.data;
  }
);

/**
 * Delete a saved report
 */
export const deleteSavedReport = createAsyncThunk(
  'savedReports/delete',
  async (id: string) => {
    await api.delete(`/saved-reports/${id}`);
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
        state.reports = action.payload;
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
        state.reports = state.reports.filter((r) => r.id !== action.payload);
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
