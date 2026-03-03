import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { scheduledReportsApiClient } from '../api/scheduledReportsApiClient';
import type {
  CreateScheduledReportDTO,
  ScheduledReport,
  ScheduledReportRun,
  UpdateScheduledReportDTO,
} from '../types/contracts';

interface ScheduledReportsState {
  reports: ScheduledReport[];
  runsByReportId: Record<string, ScheduledReportRun[]>;
  loading: boolean;
  error: string | null;
}

const initialState: ScheduledReportsState = {
  reports: [],
  runsByReportId: {},
  loading: false,
  error: null,
};

const upsertReport = (
  reports: ScheduledReport[],
  incoming: ScheduledReport
): ScheduledReport[] => {
  const index = reports.findIndex((report) => report.id === incoming.id);
  if (index === -1) {
    return [incoming, ...reports];
  }

  const next = [...reports];
  next[index] = incoming;
  return next;
};

export const fetchScheduledReports = createAsyncThunk(
  'scheduledReports/fetchScheduledReports',
  async () => {
    return scheduledReportsApiClient.fetchScheduledReports();
  }
);

export const fetchScheduledReportById = createAsyncThunk(
  'scheduledReports/fetchScheduledReportById',
  async (scheduledReportId: string) => {
    return scheduledReportsApiClient.fetchScheduledReportById(scheduledReportId);
  }
);

export const createScheduledReport = createAsyncThunk(
  'scheduledReports/createScheduledReport',
  async (payload: CreateScheduledReportDTO) => {
    return scheduledReportsApiClient.createScheduledReport(payload);
  }
);

export const updateScheduledReport = createAsyncThunk(
  'scheduledReports/updateScheduledReport',
  async (payload: { scheduledReportId: string; data: UpdateScheduledReportDTO }) => {
    return scheduledReportsApiClient.updateScheduledReport(payload.scheduledReportId, payload.data);
  }
);

export const toggleScheduledReport = createAsyncThunk(
  'scheduledReports/toggleScheduledReport',
  async (payload: { scheduledReportId: string; is_active?: boolean }) => {
    return scheduledReportsApiClient.toggleScheduledReport(
      payload.scheduledReportId,
      payload.is_active === undefined ? {} : { is_active: payload.is_active }
    );
  }
);

export const runScheduledReportNow = createAsyncThunk(
  'scheduledReports/runScheduledReportNow',
  async (scheduledReportId: string) => {
    return {
      scheduledReportId,
      run: await scheduledReportsApiClient.runScheduledReportNow(scheduledReportId),
    };
  }
);

export const deleteScheduledReport = createAsyncThunk(
  'scheduledReports/deleteScheduledReport',
  async (scheduledReportId: string) => {
    await scheduledReportsApiClient.deleteScheduledReport(scheduledReportId);
    return scheduledReportId;
  }
);

export const fetchScheduledReportRuns = createAsyncThunk(
  'scheduledReports/fetchScheduledReportRuns',
  async (payload: { scheduledReportId: string; limit?: number }) => {
    return {
      scheduledReportId: payload.scheduledReportId,
      runs: await scheduledReportsApiClient.fetchScheduledReportRuns(
        payload.scheduledReportId,
        payload.limit
      ),
    };
  }
);

const scheduledReportsSlice = createSlice({
  name: 'scheduledReports',
  initialState,
  reducers: {
    clearScheduledReportsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduledReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScheduledReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(fetchScheduledReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch scheduled reports';
      })
      .addCase(fetchScheduledReportById.fulfilled, (state, action) => {
        state.reports = upsertReport(state.reports, action.payload);
      })
      .addCase(createScheduledReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createScheduledReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = upsertReport(state.reports, action.payload);
      })
      .addCase(createScheduledReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create scheduled report';
      })
      .addCase(updateScheduledReport.fulfilled, (state, action) => {
        state.reports = upsertReport(state.reports, action.payload);
      })
      .addCase(toggleScheduledReport.fulfilled, (state, action) => {
        state.reports = upsertReport(state.reports, action.payload);
      })
      .addCase(deleteScheduledReport.fulfilled, (state, action) => {
        state.reports = state.reports.filter((report) => report.id !== action.payload);
        delete state.runsByReportId[action.payload];
      })
      .addCase(fetchScheduledReportRuns.fulfilled, (state, action) => {
        state.runsByReportId[action.payload.scheduledReportId] = action.payload.runs;
      })
      .addCase(runScheduledReportNow.fulfilled, (state, action) => {
        const existingRuns = state.runsByReportId[action.payload.scheduledReportId] || [];
        state.runsByReportId[action.payload.scheduledReportId] = [
          action.payload.run,
          ...existingRuns,
        ];
      });
  },
});

export const { clearScheduledReportsError } = scheduledReportsSlice.actions;

export default scheduledReportsSlice.reducer;
