import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { casesApiClient } from '../api/casesApiClient';
import type {
  Case,
  CaseFilter,
  BulkStatusUpdateDTO,
} from '../../../types/case';

export interface CasesListState {
  cases: Case[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: CaseFilter;
  selectedCaseIds: string[];
  summary: any | null; // Adjust type as needed
}

const initialState: CasesListState = {
  cases: [],
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
  selectedCaseIds: [],
  summary: null,
};

export const fetchCases = createAsyncThunk(
  'casesList/fetchCases',
  async (filters: CaseFilter = {}) => {
    return await casesApiClient.listCases(filters);
  }
);

export const fetchCaseSummary = createAsyncThunk(
  'casesList/fetchCaseSummary',
  async () => {
    return await casesApiClient.getCaseSummary();
  }
);

export const bulkUpdateCaseStatus = createAsyncThunk(
  'casesList/bulkUpdateStatus',
  async (data: BulkStatusUpdateDTO) => {
    const payload = await casesApiClient.bulkUpdateStatus(data);
    return {
      ...payload,
      case_ids: data.case_ids,
      new_status_id: data.new_status_id,
    };
  }
);

const casesListSlice = createSlice({
  name: 'casesList',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    toggleCaseSelection: (state, action) => {
      const caseId = action.payload as string;
      const idx = state.selectedCaseIds.indexOf(caseId);
      if (idx === -1) {
        state.selectedCaseIds.push(caseId);
      } else {
        state.selectedCaseIds.splice(idx, 1);
      }
    },
    selectAllCases: (state) => {
      state.selectedCaseIds = state.cases.map((c) => c.id);
    },
    clearCaseSelection: (state) => {
      state.selectedCaseIds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCases.fulfilled, (state, action) => {
        state.loading = false;
        state.cases = action.payload.cases;
        state.total = action.payload.total;
      })
      .addCase(fetchCases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cases';
      })
      .addCase(fetchCaseSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      .addCase(bulkUpdateCaseStatus.fulfilled, (state) => {
        state.selectedCaseIds = [];
      });
  },
});

export const {
  setFilters,
  clearFilters,
  toggleCaseSelection,
  selectAllCases,
  clearCaseSelection,
} = casesListSlice.actions;
export default casesListSlice.reducer;
