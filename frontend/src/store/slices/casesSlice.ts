import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import api from '../../services/api';
import { formatApiErrorMessageWith } from '../../utils/apiError';
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
  CaseStatusType,
  CaseMilestonesResponse,
  CaseMilestone,
  CreateCaseMilestoneDTO,
  UpdateCaseMilestoneDTO,
  BulkStatusUpdateDTO,
  ReassignCaseDTO,
} from '../../types/case';

const getErrorMessage = (error: unknown, fallbackMessage: string) => formatApiErrorMessageWith(fallbackMessage)(error);

const initialState: CasesState = {
  cases: [],
  currentCase: null,
  caseTypes: [],
  caseStatuses: [],
  caseNotes: [],
  caseMilestones: [],
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
  selectedCaseIds: [],
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
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch cases'));
    }
  }
);

export const fetchCaseById = createAsyncThunk(
  'cases/fetchCaseById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseWithDetails>(`/cases/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch case'));
    }
  }
);

export const createCase = createAsyncThunk(
  'cases/createCase',
  async (data: CreateCaseDTO, { rejectWithValue }) => {
    try {
      const response = await api.post<CaseWithDetails>('/cases', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create case'));
    }
  }
);

export const updateCase = createAsyncThunk(
  'cases/updateCase',
  async ({ id, data }: { id: string; data: UpdateCaseDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseWithDetails>(`/cases/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update case'));
    }
  }
);

export const deleteCase = createAsyncThunk(
  'cases/deleteCase',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cases/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete case'));
    }
  }
);

export const updateCaseStatus = createAsyncThunk(
  'cases/updateCaseStatus',
  async ({ id, data }: { id: string; data: UpdateCaseStatusDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseWithDetails>(`/cases/${id}/status`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update status'));
    }
  }
);

export const fetchCaseNotes = createAsyncThunk(
  'cases/fetchCaseNotes',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseNotesResponse>(`/cases/${caseId}/notes`);
      return response.data.notes;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch notes'));
    }
  }
);

export const createCaseNote = createAsyncThunk(
  'cases/createCaseNote',
  async (data: CreateCaseNoteDTO, { rejectWithValue }) => {
    try {
      const response = await api.post('/cases/notes', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create note'));
    }
  }
);

export const fetchCaseTypes = createAsyncThunk(
  'cases/fetchCaseTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseTypesResponse>('/cases/types');
      return response.data.types;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch case types'));
    }
  }
);

export const fetchCaseStatuses = createAsyncThunk(
  'cases/fetchCaseStatuses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseStatusesResponse>('/cases/statuses');
      return response.data.statuses;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch statuses'));
    }
  }
);

export const fetchCaseSummary = createAsyncThunk(
  'cases/fetchCaseSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseSummary>('/cases/summary');
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch summary'));
    }
  }
);

// Milestones

export const fetchCaseMilestones = createAsyncThunk(
  'cases/fetchCaseMilestones',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseMilestonesResponse>(`/cases/${caseId}/milestones`);
      return response.data.milestones;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch milestones'));
    }
  }
);

export const createCaseMilestone = createAsyncThunk(
  'cases/createCaseMilestone',
  async ({ caseId, data }: { caseId: string; data: CreateCaseMilestoneDTO }, { rejectWithValue }) => {
    try {
      const response = await api.post<CaseMilestone>(`/cases/${caseId}/milestones`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create milestone'));
    }
  }
);

export const updateCaseMilestone = createAsyncThunk(
  'cases/updateCaseMilestone',
  async ({ milestoneId, data }: { milestoneId: string; data: UpdateCaseMilestoneDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseMilestone>(`/cases/milestones/${milestoneId}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update milestone'));
    }
  }
);

export const deleteCaseMilestone = createAsyncThunk(
  'cases/deleteCaseMilestone',
  async (milestoneId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cases/milestones/${milestoneId}`);
      return milestoneId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete milestone'));
    }
  }
);

// Bulk & reassignment

export const bulkUpdateCaseStatus = createAsyncThunk(
  'cases/bulkUpdateStatus',
  async (data: BulkStatusUpdateDTO, { rejectWithValue }) => {
    try {
      const response = await api.post('/cases/bulk-status', data);
      return { ...response.data, case_ids: data.case_ids, new_status_id: data.new_status_id };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to bulk update status'));
    }
  }
);

export const reassignCase = createAsyncThunk(
  'cases/reassignCase',
  async ({ id, data }: { id: string; data: ReassignCaseDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseWithDetails>(`/cases/${id}/reassign`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to reassign case'));
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
      state.caseMilestones = [];
    },
    clearError: (state) => {
      state.error = null;
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
      })
      // Fetch Milestones
      .addCase(fetchCaseMilestones.fulfilled, (state, action) => {
        state.caseMilestones = action.payload;
      })
      // Create Milestone
      .addCase(createCaseMilestone.fulfilled, (state, action) => {
        state.caseMilestones.push(action.payload);
      })
      // Update Milestone
      .addCase(updateCaseMilestone.fulfilled, (state, action) => {
        const idx = state.caseMilestones.findIndex((m) => m.id === action.payload.id);
        if (idx !== -1) {
          state.caseMilestones[idx] = action.payload;
        }
      })
      // Delete Milestone
      .addCase(deleteCaseMilestone.fulfilled, (state, action) => {
        state.caseMilestones = state.caseMilestones.filter((m) => m.id !== action.payload);
      })
      // Bulk Update Status
      .addCase(bulkUpdateCaseStatus.fulfilled, (state) => {
        state.selectedCaseIds = [];
      })
      // Reassign Case
      .addCase(reassignCase.fulfilled, (state, action) => {
        const idx = state.cases.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) {
          state.cases[idx] = action.payload;
        }
        if (state.currentCase?.id === action.payload.id) {
          state.currentCase = action.payload;
        }
      });
  },
});

export const { setFilters, clearFilters, clearCurrentCase, clearError, toggleCaseSelection, selectAllCases, clearCaseSelection } = casesSlice.actions;
export default casesSlice.reducer;

// Selectors
const isClosedStatus = (status?: CaseStatusType) => status === 'closed' || status === 'cancelled';
const isActiveStatus = (status?: CaseStatusType) => !isClosedStatus(status);
const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Base selector
const selectCasesState = (state: { cases: CasesState }) => state.cases;
const selectCasesList = createSelector([selectCasesState], (state) => state.cases);

/**
 * Select cases assigned to a specific user
 */
export const selectCasesByAssignee = createSelector(
  [selectCasesList, (_, userId: string) => userId],
  (cases, userId) => cases.filter((case_) => case_.assigned_to === userId)
);

/**
 * Select cases for a specific contact
 */
export const selectCasesByContact = createSelector(
  [selectCasesList, (_, contactId: string) => contactId],
  (cases, contactId) => cases.filter((case_) => case_.contact_id === contactId)
);

/**
 * Select urgent cases
 */
export const selectUrgentCases = createSelector(
  [selectCasesList],
  (cases) => cases.filter((case_) => case_.is_urgent || case_.priority === 'urgent')
);

/**
 * Select overdue cases (due_date is past and case is not closed)
 */
export const selectOverdueCases = createSelector(
  [selectCasesList],
  (cases) => {
    const now = new Date();
    return cases.filter((case_) => {
      if (!isActiveStatus(case_.status_type)) return false;
      const dueDate = parseDate(case_.due_date);
      if (!dueDate) return false;
      return dueDate < now;
    });
  }
);

/**
 * Select cases due within a specified number of days
 */
export const selectCasesDueWithinDays = createSelector(
  [selectCasesList, (_, days: number = 7) => days],
  (cases, days) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return cases.filter((case_) => {
      if (!isActiveStatus(case_.status_type)) return false;
      const dueDate = parseDate(case_.due_date);
      if (!dueDate) return false;
      return dueDate >= now && dueDate <= futureDate;
    });
  }
);

/**
 * Select cases due this week (memoized version of selectCasesDueWithinDays with 7 days)
 */
export const selectCasesDueThisWeek = createSelector(
  [selectCasesList],
  (cases) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return cases.filter((case_) => {
      if (!isActiveStatus(case_.status_type)) return false;
      const dueDate = parseDate(case_.due_date);
      if (!dueDate) return false;
      return dueDate >= now && dueDate <= futureDate;
    });
  }
);

/**
 * Select unassigned cases
 */
export const selectUnassignedCases = createSelector(
  [selectCasesList],
  (cases) => cases.filter((case_) => !case_.assigned_to && isActiveStatus(case_.status_type))
);

/**
 * Select active cases (not closed or cancelled)
 */
export const selectActiveCases = createSelector(
  [selectCasesList],
  (cases) => cases.filter((case_) => isActiveStatus(case_.status_type))
);

/**
 * Count cases by priority (memoized)
 */
export const selectCasesByPriority = createSelector(
  [selectCasesList],
  (cases) => {
    const counts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    cases.forEach((case_) => {
      if (isActiveStatus(case_.status_type)) {
        counts[case_.priority]++;
      }
    });

    return counts;
  }
);
