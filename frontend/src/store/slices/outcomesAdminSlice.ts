import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { formatApiErrorMessageWith } from '../../utils/apiError';
import type {
  OutcomeDefinition,
  OutcomeDefinitionCreateInput,
  OutcomeDefinitionUpdateInput,
} from '../../types/outcomes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface OutcomesAdminState {
  definitions: OutcomeDefinition[];
  includeInactive: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: OutcomesAdminState = {
  definitions: [],
  includeInactive: true,
  loading: false,
  saving: false,
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

export const fetchOutcomeDefinitionsAdmin = createAsyncThunk(
  'outcomesAdmin/fetchDefinitions',
  async (includeInactive: boolean = true, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiEnvelope<OutcomeDefinition[]> | OutcomeDefinition[]>(
        `/admin/outcomes?includeInactive=${String(includeInactive)}`
      );
      return {
        definitions: extractEnvelopeData<OutcomeDefinition[]>(response.data),
        includeInactive,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load outcomes'));
    }
  }
);

export const createOutcomeDefinition = createAsyncThunk(
  'outcomesAdmin/createDefinition',
  async (payload: OutcomeDefinitionCreateInput, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiEnvelope<OutcomeDefinition> | OutcomeDefinition>(
        '/admin/outcomes',
        payload
      );
      return extractEnvelopeData<OutcomeDefinition>(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create outcome'));
    }
  }
);

export const updateOutcomeDefinition = createAsyncThunk(
  'outcomesAdmin/updateDefinition',
  async (
    { id, payload }: { id: string; payload: OutcomeDefinitionUpdateInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch<ApiEnvelope<OutcomeDefinition> | OutcomeDefinition>(
        `/admin/outcomes/${id}`,
        payload
      );
      return extractEnvelopeData<OutcomeDefinition>(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update outcome'));
    }
  }
);

export const enableOutcomeDefinition = createAsyncThunk(
  'outcomesAdmin/enableDefinition',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiEnvelope<OutcomeDefinition> | OutcomeDefinition>(
        `/admin/outcomes/${id}/enable`
      );
      return extractEnvelopeData<OutcomeDefinition>(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to enable outcome'));
    }
  }
);

export const disableOutcomeDefinition = createAsyncThunk(
  'outcomesAdmin/disableDefinition',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiEnvelope<OutcomeDefinition> | OutcomeDefinition>(
        `/admin/outcomes/${id}/disable`
      );
      return extractEnvelopeData<OutcomeDefinition>(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to disable outcome'));
    }
  }
);

export const reorderOutcomeDefinitions = createAsyncThunk(
  'outcomesAdmin/reorderDefinitions',
  async (orderedIds: string[], { rejectWithValue }) => {
    try {
      const response = await api.post<ApiEnvelope<OutcomeDefinition[]> | OutcomeDefinition[]>(
        '/admin/outcomes/reorder',
        { orderedIds }
      );
      return extractEnvelopeData<OutcomeDefinition[]>(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to reorder outcomes'));
    }
  }
);

const upsertDefinition = (definitions: OutcomeDefinition[], next: OutcomeDefinition): OutcomeDefinition[] => {
  const idx = definitions.findIndex((item) => item.id === next.id);
  if (idx === -1) {
    return [...definitions, next].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }

  const updated = [...definitions];
  updated[idx] = next;
  return updated.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
};

const outcomesAdminSlice = createSlice({
  name: 'outcomesAdmin',
  initialState,
  reducers: {
    clearOutcomesAdminError: (state) => {
      state.error = null;
    },
    setOutcomesAdminIncludeInactive: (state, action: PayloadAction<boolean>) => {
      state.includeInactive = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutcomeDefinitionsAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOutcomeDefinitionsAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.includeInactive = action.payload.includeInactive;
        state.definitions = action.payload.definitions;
      })
      .addCase(fetchOutcomeDefinitionsAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load outcomes';
      })

      .addCase(createOutcomeDefinition.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createOutcomeDefinition.fulfilled, (state, action) => {
        state.saving = false;
        state.definitions = upsertDefinition(state.definitions, action.payload);
      })
      .addCase(createOutcomeDefinition.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Failed to create outcome';
      })

      .addCase(updateOutcomeDefinition.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateOutcomeDefinition.fulfilled, (state, action) => {
        state.saving = false;
        state.definitions = upsertDefinition(state.definitions, action.payload);
      })
      .addCase(updateOutcomeDefinition.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Failed to update outcome';
      })

      .addCase(enableOutcomeDefinition.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(enableOutcomeDefinition.fulfilled, (state, action) => {
        state.saving = false;
        state.definitions = upsertDefinition(state.definitions, action.payload);
      })
      .addCase(enableOutcomeDefinition.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Failed to enable outcome';
      })

      .addCase(disableOutcomeDefinition.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(disableOutcomeDefinition.fulfilled, (state, action) => {
        state.saving = false;
        state.definitions = upsertDefinition(state.definitions, action.payload);
      })
      .addCase(disableOutcomeDefinition.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Failed to disable outcome';
      })

      .addCase(reorderOutcomeDefinitions.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(reorderOutcomeDefinitions.fulfilled, (state, action) => {
        state.saving = false;
        state.definitions = action.payload;
      })
      .addCase(reorderOutcomeDefinitions.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Failed to reorder outcomes';
      });
  },
});

export const { clearOutcomesAdminError, setOutcomesAdminIncludeInactive } =
  outcomesAdminSlice.actions;

export default outcomesAdminSlice.reducer;
