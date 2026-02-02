/**
 * Reports Redux Slice
 * State management for custom report generation
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  ReportDefinition,
  ReportResult,
  ReportEntity,
  AvailableFields,
} from '../../types/report';

export interface ReportsState {
  currentReport: ReportResult | null;
  availableFields: Record<ReportEntity, AvailableFields | null>;
  loading: boolean;
  fieldsLoading: boolean;
  error: string | null;
}

const initialState: ReportsState = {
  currentReport: null,
  availableFields: {
    accounts: null,
    contacts: null,
    donations: null,
    events: null,
    volunteers: null,
    tasks: null,
  },
  loading: false,
  fieldsLoading: false,
  error: null,
};

// Async Thunks

/**
 * Generate a custom report
 */
export const generateReport = createAsyncThunk(
  'reports/generate',
  async (definition: ReportDefinition) => {
    const response = await api.post('/reports/generate', definition);
    return response.data;
  }
);

/**
 * Fetch available fields for an entity
 */
export const fetchAvailableFields = createAsyncThunk(
  'reports/fetchAvailableFields',
  async (entity: ReportEntity) => {
    const response = await api.get(`/reports/fields/${entity}`);
    return response.data;
  }
);

// Slice
const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate Report
      .addCase(generateReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReport.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReport = action.payload;
      })
      .addCase(generateReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate report';
      })
      // Fetch Available Fields
      .addCase(fetchAvailableFields.pending, (state) => {
        state.fieldsLoading = true;
      })
      .addCase(fetchAvailableFields.fulfilled, (state, action) => {
        state.fieldsLoading = false;
        const entity = action.payload.entity as ReportEntity;
        state.availableFields[entity] = action.payload;
      })
      .addCase(fetchAvailableFields.rejected, (state, action) => {
        state.fieldsLoading = false;
        state.error = action.error.message || 'Failed to fetch available fields';
      });
  },
});

export const { clearCurrentReport, clearError } = reportsSlice.actions;

export default reportsSlice.reducer;
