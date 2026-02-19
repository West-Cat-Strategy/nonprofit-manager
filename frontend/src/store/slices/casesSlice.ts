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
  CaseRelationship,
  CaseService,
  CreateCaseRelationshipDTO,
  CreateCaseServiceDTO,
  UpdateCaseServiceDTO,
  CaseRelationshipsResponse,
  CaseServicesResponse,
} from '../../types/case';
import type {
  InteractionOutcomeImpact,
  OutcomeDefinition,
  UpdateInteractionOutcomesInput,
} from '../../types/outcomes';

const getErrorMessage = (error: unknown, fallbackMessage: string) => formatApiErrorMessageWith(fallbackMessage)(error);

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

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

const initialState: CasesState = {
  cases: [],
  currentCase: null,
  caseTypes: [],
  caseStatuses: [],
  caseNotes: [],
  caseMilestones: [],
  caseRelationships: [],
  caseServices: [],
  caseOutcomeDefinitions: [],
  interactionOutcomeImpacts: {},
  summary: null,
  total: 0,
  loading: false,
  error: null,
  outcomesLoading: false,
  outcomesSaving: false,
  outcomesError: null,
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

export const fetchCaseOutcomeDefinitions = createAsyncThunk(
  'cases/fetchCaseOutcomeDefinitions',
  async (includeInactive: boolean = false, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiEnvelope<OutcomeDefinition[]> | OutcomeDefinition[]>(
        `/cases/outcomes/definitions?includeInactive=${String(includeInactive)}`
      );
      return extractEnvelopeData<OutcomeDefinition[]>(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch outcome definitions'));
    }
  }
);

export const fetchInteractionOutcomes = createAsyncThunk(
  'cases/fetchInteractionOutcomes',
  async (
    { caseId, interactionId }: { caseId: string; interactionId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get<ApiEnvelope<InteractionOutcomeImpact[]> | InteractionOutcomeImpact[]>(
        `/cases/${caseId}/interactions/${interactionId}/outcomes`
      );
      return {
        interactionId,
        impacts: extractEnvelopeData<InteractionOutcomeImpact[]>(response.data),
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch interaction outcomes'));
    }
  }
);

export const saveInteractionOutcomes = createAsyncThunk(
  'cases/saveInteractionOutcomes',
  async (
    {
      caseId,
      interactionId,
      data,
    }: {
      caseId: string;
      interactionId: string;
      data: UpdateInteractionOutcomesInput;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put<ApiEnvelope<InteractionOutcomeImpact[]> | InteractionOutcomeImpact[]>(
        `/cases/${caseId}/interactions/${interactionId}/outcomes`,
        data
      );
      return {
        interactionId,
        impacts: extractEnvelopeData<InteractionOutcomeImpact[]>(response.data),
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to save interaction outcomes'));
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

// Relationships

export const fetchCaseRelationships = createAsyncThunk(
  'cases/fetchCaseRelationships',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseRelationshipsResponse>(`/cases/${caseId}/relationships`);
      return response.data.relationships;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch relationships'));
    }
  }
);

export const createCaseRelationship = createAsyncThunk(
  'cases/createCaseRelationship',
  async ({ caseId, data }: { caseId: string; data: CreateCaseRelationshipDTO }, { rejectWithValue }) => {
    try {
      const response = await api.post<CaseRelationship>(`/cases/${caseId}/relationships`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create relationship'));
    }
  }
);

export const deleteCaseRelationship = createAsyncThunk(
  'cases/deleteCaseRelationship',
  async (relationshipId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cases/relationships/${relationshipId}`);
      return relationshipId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete relationship'));
    }
  }
);

// Services

export const fetchCaseServices = createAsyncThunk(
  'cases/fetchCaseServices',
  async (caseId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<CaseServicesResponse>(`/cases/${caseId}/services`);
      return response.data.services;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch services'));
    }
  }
);

export const createCaseService = createAsyncThunk(
  'cases/createCaseService',
  async ({ caseId, data }: { caseId: string; data: CreateCaseServiceDTO }, { rejectWithValue }) => {
    try {
      const response = await api.post<CaseService>(`/cases/${caseId}/services`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create service'));
    }
  }
);

export const updateCaseService = createAsyncThunk(
  'cases/updateCaseService',
  async ({ serviceId, data }: { serviceId: string; data: UpdateCaseServiceDTO }, { rejectWithValue }) => {
    try {
      const response = await api.put<CaseService>(`/cases/services/${serviceId}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update service'));
    }
  }
);

export const deleteCaseService = createAsyncThunk(
  'cases/deleteCaseService',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cases/services/${serviceId}`);
      return serviceId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete service'));
    }
  }
);

// Slice

const applyImpactsToCaseNote = (
  state: CasesState,
  interactionId: string,
  impacts: InteractionOutcomeImpact[]
) => {
  if (!state.interactionOutcomeImpacts) {
    state.interactionOutcomeImpacts = {};
  }
  state.interactionOutcomeImpacts[interactionId] = impacts;

  const noteIndex = state.caseNotes.findIndex((note) => note.id === interactionId);
  if (noteIndex !== -1) {
    state.caseNotes[noteIndex] = {
      ...state.caseNotes[noteIndex],
      outcome_impacts: impacts,
    };
  }
};

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
      state.caseRelationships = [];
      state.caseServices = [];
      state.interactionOutcomeImpacts = {};
    },
    clearError: (state) => {
      state.error = null;
      state.outcomesError = null;
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
        state.interactionOutcomeImpacts = action.payload.reduce<Record<string, InteractionOutcomeImpact[]>>(
          (acc, note) => {
            acc[note.id] = note.outcome_impacts || [];
            return acc;
          },
          {}
        );
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
      // Fetch case outcome definitions
      .addCase(fetchCaseOutcomeDefinitions.pending, (state) => {
        state.outcomesLoading = true;
        state.outcomesError = null;
      })
      .addCase(fetchCaseOutcomeDefinitions.fulfilled, (state, action) => {
        state.outcomesLoading = false;
        state.caseOutcomeDefinitions = action.payload;
      })
      .addCase(fetchCaseOutcomeDefinitions.rejected, (state, action) => {
        state.outcomesLoading = false;
        state.outcomesError = action.payload as string;
      })
      // Fetch interaction outcomes
      .addCase(fetchInteractionOutcomes.pending, (state) => {
        state.outcomesLoading = true;
        state.outcomesError = null;
      })
      .addCase(fetchInteractionOutcomes.fulfilled, (state, action) => {
        state.outcomesLoading = false;
        applyImpactsToCaseNote(state, action.payload.interactionId, action.payload.impacts);
      })
      .addCase(fetchInteractionOutcomes.rejected, (state, action) => {
        state.outcomesLoading = false;
        state.outcomesError = action.payload as string;
      })
      // Save interaction outcomes
      .addCase(saveInteractionOutcomes.pending, (state) => {
        state.outcomesSaving = true;
        state.outcomesError = null;
      })
      .addCase(saveInteractionOutcomes.fulfilled, (state, action) => {
        state.outcomesSaving = false;
        applyImpactsToCaseNote(state, action.payload.interactionId, action.payload.impacts);
      })
      .addCase(saveInteractionOutcomes.rejected, (state, action) => {
        state.outcomesSaving = false;
        state.outcomesError = action.payload as string;
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
      })
      // Fetch Relationships
      .addCase(fetchCaseRelationships.fulfilled, (state, action) => {
        state.caseRelationships = action.payload;
      })
      // Create Relationship
      .addCase(createCaseRelationship.fulfilled, (state, action) => {
        state.caseRelationships.unshift(action.payload);
      })
      // Delete Relationship
      .addCase(deleteCaseRelationship.fulfilled, (state, action) => {
        state.caseRelationships = state.caseRelationships.filter((r) => r.id !== action.payload);
      })
      // Fetch Services
      .addCase(fetchCaseServices.fulfilled, (state, action) => {
        state.caseServices = action.payload;
      })
      // Create Service
      .addCase(createCaseService.fulfilled, (state, action) => {
        state.caseServices.unshift(action.payload);
        if (state.currentCase) {
          state.currentCase.services_count = (state.currentCase.services_count || 0) + 1;
        }
      })
      // Update Service
      .addCase(updateCaseService.fulfilled, (state, action) => {
        const idx = state.caseServices.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) {
          state.caseServices[idx] = action.payload;
        }
      })
      // Delete Service
      .addCase(deleteCaseService.fulfilled, (state, action) => {
        state.caseServices = state.caseServices.filter((s) => s.id !== action.payload);
        if (state.currentCase) {
          state.currentCase.services_count = Math.max(0, (state.currentCase.services_count || 0) - 1);
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
