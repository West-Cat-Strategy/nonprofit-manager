/**
 * Reports Redux Slice
 * State management for custom report generation
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reportsApiClient } from '../api/reportsApiClient';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import type {
  CreateReportExportJobRequest,
  ReportDefinition,
  ReportEntity,
  ReportExportJob,
  ReportField,
  ReportResult,
} from '../types/contracts';

export interface ReportsState {
  currentReport: ReportResult | null;
  availableFields: Record<ReportEntity, ReportField[] | null>;
  exportJobs: ReportExportJob[];
  exportJobsLoading: boolean;
  activeExportJobId: string | null;
  loading: boolean;
  fieldsLoading: boolean;
  error: string | null;
  exportJobError: string | null;
}

const getErrorMessage = (error: unknown, fallbackMessage: string): string =>
  formatApiErrorMessageWith(fallbackMessage)(error);

const sortExportJobs = (jobs: ReportExportJob[]): ReportExportJob[] =>
  [...jobs].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

const upsertExportJob = (
  jobs: ReportExportJob[],
  incoming: ReportExportJob
): ReportExportJob[] => {
  const index = jobs.findIndex((job) => job.id === incoming.id);
  if (index === -1) {
    return sortExportJobs([incoming, ...jobs]);
  }

  const next = [...jobs];
  next[index] = incoming;
  return sortExportJobs(next);
};

const initialState: ReportsState = {
  currentReport: null,
  availableFields: {
    accounts: null,
    contacts: null,
    donations: null,
    events: null,
    appointments: null,
    follow_ups: null,
    attendance: null,
    volunteers: null,
    tasks: null,
    cases: null,
    opportunities: null,
    expenses: null,
    grants: null,
    programs: null,
  },
  exportJobs: [],
  exportJobsLoading: false,
  activeExportJobId: null,
  loading: false,
  fieldsLoading: false,
  error: null,
  exportJobError: null,
};

// Async Thunks

/**
 * Generate a custom report
 */
export const generateReport = createAsyncThunk(
  'reports/generate',
  async (definition: ReportDefinition) => {
    return reportsApiClient.generateReport(definition);
  }
);

/**
 * Fetch available fields for an entity
 */
export const fetchAvailableFields = createAsyncThunk(
  'reports/fetchAvailableFields',
  async (entity: ReportEntity) => {
    return reportsApiClient.fetchAvailableFields(entity);
  }
);

export const fetchReportExportJobs = createAsyncThunk<
  ReportExportJob[],
  { limit?: number } | undefined,
  { rejectValue: string }
>('reports/fetchReportExportJobs', async (payload, { rejectWithValue }) => {
  try {
    return await reportsApiClient.listExportJobs(payload?.limit ?? 10);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load report exports'));
  }
});

export const fetchReportExportJob = createAsyncThunk<
  ReportExportJob,
  string,
  { rejectValue: string }
>('reports/fetchReportExportJob', async (jobId, { rejectWithValue }) => {
  try {
    return await reportsApiClient.getExportJob(jobId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to refresh report export'));
  }
});

export const createReportExportJob = createAsyncThunk<
  ReportExportJob,
  CreateReportExportJobRequest,
  { rejectValue: string }
>('reports/createReportExportJob', async (payload, { rejectWithValue }) => {
  try {
    return await reportsApiClient.createExportJob(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to start report export'));
  }
});

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
    clearExportJobError: (state) => {
      state.exportJobError = null;
    },
    setActiveExportJobId: (state, action) => {
      state.activeExportJobId = action.payload as string | null;
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
        state.availableFields[entity] = action.payload.fields || [];
      })
      .addCase(fetchAvailableFields.rejected, (state, action) => {
        state.fieldsLoading = false;
        state.error = action.error.message || 'Failed to fetch available fields';
      })
      .addCase(fetchReportExportJobs.pending, (state) => {
        state.exportJobsLoading = true;
        state.exportJobError = null;
      })
      .addCase(fetchReportExportJobs.fulfilled, (state, action) => {
        state.exportJobsLoading = false;
        const exportJobs = Array.isArray(action.payload) ? action.payload : [];
        state.exportJobs = exportJobs.reduce(
          (jobs, job) => upsertExportJob(jobs, job),
          state.exportJobs
        );
      })
      .addCase(fetchReportExportJobs.rejected, (state, action) => {
        state.exportJobsLoading = false;
        state.exportJobError = (action.payload as string) || 'Failed to load report exports';
      })
      .addCase(fetchReportExportJob.pending, (state, action) => {
        state.exportJobsLoading = true;
        state.exportJobError = null;
        state.activeExportJobId = action.meta.arg;
      })
      .addCase(fetchReportExportJob.fulfilled, (state, action) => {
        state.exportJobsLoading = false;
        state.exportJobs = upsertExportJob(state.exportJobs, action.payload);
      })
      .addCase(fetchReportExportJob.rejected, (state, action) => {
        state.exportJobsLoading = false;
        state.exportJobError = (action.payload as string) || 'Failed to refresh report export';
      })
      .addCase(createReportExportJob.pending, (state) => {
        state.exportJobsLoading = true;
        state.exportJobError = null;
      })
      .addCase(createReportExportJob.fulfilled, (state, action) => {
        state.exportJobsLoading = false;
        state.activeExportJobId = action.payload.id;
        state.exportJobs = upsertExportJob(state.exportJobs, action.payload);
      })
      .addCase(createReportExportJob.rejected, (state, action) => {
        state.exportJobsLoading = false;
        state.exportJobError = (action.payload as string) || 'Failed to start report export';
      });
  },
});

export const { clearCurrentReport, clearError, clearExportJobError, setActiveExportJobId } =
  reportsSlice.actions;

export default reportsSlice.reducer;
