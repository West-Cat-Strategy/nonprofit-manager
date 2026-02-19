import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { formatApiErrorMessageWith } from '../../utils/apiError';
import type { OutcomesReportData, OutcomesReportFilters } from '../../types/outcomes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface OutcomesReportsState {
  report: OutcomesReportData | null;
  filters: OutcomesReportFilters | null;
  loading: boolean;
  error: string | null;
}

const initialState: OutcomesReportsState = {
  report: null,
  filters: null,
  loading: false,
  error: null,
};

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  formatApiErrorMessageWith(fallbackMessage)(error);

const extractEnvelopeData = <T>(responseData: ApiEnvelope<T> | T): T => {
  if (
    responseData &&
    typeof responseData === 'object' &&
    'success' in responseData &&
    'data' in responseData
  ) {
    return (responseData as ApiEnvelope<T>).data;
  }

  return responseData as T;
};

export const fetchOutcomesReport = createAsyncThunk(
  'outcomesReports/fetchReport',
  async (filters: OutcomesReportFilters, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await api.get<ApiEnvelope<OutcomesReportData> | OutcomesReportData>(
        `/reports/outcomes?${params.toString()}`
      );

      return {
        report: extractEnvelopeData<OutcomesReportData>(response.data),
        filters,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load outcomes report'));
    }
  }
);

const outcomesReportsSlice = createSlice({
  name: 'outcomesReports',
  initialState,
  reducers: {
    clearOutcomesReport: (state) => {
      state.report = null;
      state.filters = null;
    },
    clearOutcomesReportError: (state) => {
      state.error = null;
    },
    setOutcomesReportFilters: (state, action: PayloadAction<OutcomesReportFilters>) => {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutcomesReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOutcomesReport.fulfilled, (state, action) => {
        state.loading = false;
        state.report = action.payload.report;
        state.filters = action.payload.filters;
      })
      .addCase(fetchOutcomesReport.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load outcomes report';
      });
  },
});

export const {
  clearOutcomesReport,
  clearOutcomesReportError,
  setOutcomesReportFilters,
} = outcomesReportsSlice.actions;

export default outcomesReportsSlice.reducer;
