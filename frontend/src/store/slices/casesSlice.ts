import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  CasesState,
  CaseWithDetails,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseFilter,
  CreateCaseNoteDTO,
  UpdateCaseStatusDTO,
  CasesResponse,
  CaseTypesResponse,
  CaseStatusesResponse,
  CaseNotesResponse,
  CaseSummary,
} from '../../types/case';

const initialState: CasesState = {
  cases: [],
  currentCase: null,
  caseTypes: [],
  caseStatuses: [],
  caseNotes: [],
  summary: null,
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
};

// Async Thunks

export const fetchCases = createAsyncThunk(
  'cases/fetchCases',
  async (filters: CaseFilter = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await api.get<CasesResponse>(`/cases?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch cases');
    }
  }
);

export const fetchCaseById = createAsyncThunk(
  'cases/fetchCaseById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseWithDetails>(`/cases/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch case');
    }
  }
);

export const createCase = createAsyncThunk(
  'cases/createCase',
  async (data: CreateCaseDTO, { rejectWithValue }) => {
    try {
      const response = await api.post<CaseWithDetails>('/cases', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create case');
    }
  }
);

export const updateCase = createAsyncThunk(
  'cases/updateCase',
  async ({ id, data }: { id: string; data: UpdateCaseDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseWithDetails>(`/cases/${id}`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update case');
    }
  }
);

export const deleteCase = createAsyncThunk(
  'cases/deleteCase',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cases/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete case');
    }
  }
);

export const updateCaseStatus = createAsyncThunk(
  'cases/updateCaseStatus',
  async ({ id, data }: { id: string; data: UpdateCaseStatusDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseWithDetails>(`/cases/${id}/status`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update status');
    }
  }
);

export const fetchCaseNotes = createAsyncThunk(
  'cases/fetchCaseNotes',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseNotesResponse>(`/cases/${caseId}/notes`);
      return response.data.notes;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch notes');
    }
  }
);

export const createCaseNote = createAsyncThunk(
  'cases/createCaseNote',
  async (data: CreateCaseNoteDTO, { rejectWithValue }) => {
    try {
      const response = await api.post('/cases/notes', data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create note');
    }
  }
);

export const fetchCaseTypes = createAsyncThunk(
  'cases/fetchCaseTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseTypesResponse>('/cases/types');
      return response.data.types;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch case types');
    }
  }
);

export const fetchCaseStatuses = createAsyncThunk(
  'cases/fetchCaseStatuses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseStatusesResponse>('/cases/statuses');
      return response.data.statuses;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch statuses');
    }
  }
);

export const fetchCaseSummary = createAsyncThunk(
  'cases/fetchCaseSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseSummary>('/cases/summary');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch summary');
    }
  }
);

// Slice

const casesSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentCase: (state) => {
      state.currentCase = null;
      state.caseNotes = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cases
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
        state.error = action.payload as string;
      })
      // Fetch Case By ID
      .addCase(fetchCaseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCaseById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCase = action.payload;
      })
      .addCase(fetchCaseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Case
      .addCase(createCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCase.fulfilled, (state, action) => {
        state.loading = false;
        state.cases.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Case
      .addCase(updateCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCase.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.cases.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.cases[index] = action.payload;
        }
        if (state.currentCase?.id === action.payload.id) {
          state.currentCase = action.payload;
        }
      })
      .addCase(updateCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Case
      .addCase(deleteCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCase.fulfilled, (state, action) => {
        state.loading = false;
        state.cases = state.cases.filter((c) => c.id !== action.payload);
        state.total -= 1;
        if (state.currentCase?.id === action.payload) {
          state.currentCase = null;
        }
      })
      .addCase(deleteCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Case Status
      .addCase(updateCaseStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCaseStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.cases.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.cases[index] = action.payload;
        }
        if (state.currentCase?.id === action.payload.id) {
          state.currentCase = action.payload;
        }
      })
      .addCase(updateCaseStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Case Notes
      .addCase(fetchCaseNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCaseNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.caseNotes = action.payload;
      })
      .addCase(fetchCaseNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Case Note
      .addCase(createCaseNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCaseNote.fulfilled, (state, action) => {
        state.loading = false;
        state.caseNotes.unshift(action.payload);
        if (state.currentCase) {
          state.currentCase.notes_count = (state.currentCase.notes_count || 0) + 1;
        }
      })
      .addCase(createCaseNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Case Types
      .addCase(fetchCaseTypes.fulfilled, (state, action) => {
        state.caseTypes = action.payload;
      })
      // Fetch Case Statuses
      .addCase(fetchCaseStatuses.fulfilled, (state, action) => {
        state.caseStatuses = action.payload;
      })
      // Fetch Case Summary
      .addCase(fetchCaseSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentCase, clearError } = casesSlice.actions;
export default casesSlice.reducer;
