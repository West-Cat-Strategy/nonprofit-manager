import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { casesApiClient } from '../api/casesApiClient';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import type {
  CaseWithDetails,
  CreateCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
  ReassignCaseDTO,
} from '../../../types/case';

const getErrorMessage = (error: unknown, fallbackMessage: string) => formatApiErrorMessageWith(fallbackMessage)(error);
const CONTACT_CASE_CACHE_TTL_MS = 2 * 60 * 1000;

export interface CasesCoreState {
  currentCase: CaseWithDetails | null;
  caseTypes: any[];
  caseStatuses: any[];
  contactCasesByContactId: Record<string, {
    cases: any[];
    loading: boolean;
    error: string | null;
    fetchedAt: number | null;
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: CasesCoreState = {
  currentCase: null,
  caseTypes: [],
  caseStatuses: [],
  contactCasesByContactId: {},
  loading: false,
  error: null,
};

// Async Thunks
export const fetchCaseById = createAsyncThunk(
  'casesCore/fetchCaseById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await casesApiClient.getCase(id);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch case'));
    }
  }
);

export const createCase = createAsyncThunk(
  'casesCore/createCase',
  async (data: CreateCaseDTO, { rejectWithValue }) => {
    try {
      return await casesApiClient.createCase(data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create case'));
    }
  }
);

export const updateCase = createAsyncThunk(
  'casesCore/updateCase',
  async ({ id, data }: { id: string; data: UpdateCaseDTO }, { rejectWithValue }) => {
    try {
      return await casesApiClient.updateCase(id, data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update case'));
    }
  }
);

export const deleteCase = createAsyncThunk(
  'casesCore/deleteCase',
  async (id: string, { rejectWithValue }) => {
    try {
      await casesApiClient.deleteCase(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete case'));
    }
  }
);

export const updateCaseStatus = createAsyncThunk(
  'casesCore/updateCaseStatus',
  async ({ id, data }: { id: string; data: UpdateCaseStatusDTO }, { rejectWithValue }) => {
    try {
      return await casesApiClient.updateCaseStatus(id, data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update status'));
    }
  }
);

export const fetchCaseTypes = createAsyncThunk(
  'casesCore/fetchCaseTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await casesApiClient.getCaseTypes();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch case types'));
    }
  }
);

export const fetchCaseStatuses = createAsyncThunk(
  'casesCore/fetchCaseStatuses',
  async (_, { rejectWithValue }) => {
    try {
      return await casesApiClient.getCaseStatuses();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch statuses'));
    }
  }
);

export const reassignCase = createAsyncThunk(
  'casesCore/reassignCase',
  async ({ id, data }: { id: string; data: ReassignCaseDTO }, { rejectWithValue }) => {
    try {
      return await casesApiClient.reassignCase(id, data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to reassign case'));
    }
  }
);

export const fetchCasesByContact = createAsyncThunk(
  'casesCore/fetchCasesByContact',
  async (contactId: string, { rejectWithValue }) => {
    try {
      const payload = await casesApiClient.listCases({
        contactId,
        page: 1,
        limit: 50,
      });
      return {
        contactId,
        cases: Array.isArray(payload.cases) ? payload.cases : [],
        fetchedAt: Date.now(),
      };
    } catch (error) {
      return rejectWithValue({
        contactId,
        message: getErrorMessage(error, 'Failed to fetch contact cases'),
      });
    }
  },
  {
    condition: (contactId, { getState }) => {
      const state = getState() as { cases?: { core: CasesCoreState } };
      const cachedEntry = state.cases?.core?.contactCasesByContactId?.[contactId];
      if (!cachedEntry) return true;
      if (cachedEntry.loading) return false;
      if (!cachedEntry.fetchedAt) return true;
      return Date.now() - cachedEntry.fetchedAt > CONTACT_CASE_CACHE_TTL_MS;
    },
  }
);

const casesCoreSlice = createSlice({
  name: 'casesCore',
  initialState,
  reducers: {
    clearCurrentCase: (state) => {
      state.currentCase = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(createCase.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateCase.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentCase?.id === action.payload.id) {
          state.currentCase = action.payload;
        }
      })
      .addCase(deleteCase.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentCase?.id === action.payload) {
          state.currentCase = null;
        }
      })
      .addCase(updateCaseStatus.fulfilled, (state, action) => {
        if (state.currentCase?.id === action.payload.id) {
          state.currentCase = action.payload;
        }
      })
      .addCase(fetchCaseTypes.fulfilled, (state, action) => {
        state.caseTypes = action.payload;
      })
      .addCase(fetchCaseStatuses.fulfilled, (state, action) => {
        state.caseStatuses = action.payload;
      })
      .addCase(reassignCase.fulfilled, (state, action) => {
        if (state.currentCase?.id === action.payload.id) {
          state.currentCase = action.payload;
        }
      })
      .addCase(fetchCasesByContact.pending, (state, action) => {
        const contactId = action.meta.arg;
        const existing = state.contactCasesByContactId[contactId];
        state.contactCasesByContactId[contactId] = {
          cases: existing?.cases ?? [],
          loading: true,
          error: null,
          fetchedAt: existing?.fetchedAt ?? null,
        };
      })
      .addCase(fetchCasesByContact.fulfilled, (state, action) => {
        state.contactCasesByContactId[action.payload.contactId] = {
          cases: action.payload.cases,
          loading: false,
          error: null,
          fetchedAt: action.payload.fetchedAt,
        };
      })
      .addCase(fetchCasesByContact.rejected, (state, action) => {
        const rejectedPayload = action.payload as { contactId?: string; message?: string } | undefined;
        const contactId = rejectedPayload?.contactId ?? action.meta.arg;
        const existing = state.contactCasesByContactId[contactId];
        state.contactCasesByContactId[contactId] = {
          cases: existing?.cases ?? [],
          loading: false,
          error: rejectedPayload?.message ?? 'Failed to fetch contact cases',
          fetchedAt: existing?.fetchedAt ?? null,
        };
      });
  },
});

export const { clearCurrentCase, clearError } = casesCoreSlice.actions;
export default casesCoreSlice.reducer;
