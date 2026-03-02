import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  CreateOpportunityDTO,
  CreateOpportunityStageDTO,
  Opportunity,
  OpportunityFilters,
  OpportunityStage,
  OpportunitySummary,
  UpdateOpportunityDTO,
} from '../../types/opportunity';

interface OpportunityPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface OpportunitiesState {
  opportunities: Opportunity[];
  stages: OpportunityStage[];
  summary: OpportunitySummary | null;
  pagination: OpportunityPagination;
  loading: boolean;
  error: string | null;
}

const initialState: OpportunitiesState = {
  opportunities: [],
  stages: [],
  summary: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
};

const buildQueryString = (filters?: OpportunityFilters): string => {
  if (!filters) return '';

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

const upsertOpportunity = (
  opportunities: Opportunity[],
  incoming: Opportunity
): Opportunity[] => {
  const index = opportunities.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...opportunities];
  }

  const next = [...opportunities];
  next[index] = incoming;
  return next;
};

export const fetchOpportunityStages = createAsyncThunk(
  'opportunities/fetchOpportunityStages',
  async () => {
    const response = await api.get<OpportunityStage[]>('/opportunities/stages');
    return response.data;
  }
);

export const createOpportunityStage = createAsyncThunk(
  'opportunities/createOpportunityStage',
  async (payload: CreateOpportunityStageDTO) => {
    const response = await api.post<OpportunityStage>('/opportunities/stages', payload);
    return response.data;
  }
);

export const updateOpportunityStage = createAsyncThunk(
  'opportunities/updateOpportunityStage',
  async (payload: { stageId: string; data: Partial<CreateOpportunityStageDTO> }) => {
    const response = await api.put<OpportunityStage>(
      `/opportunities/stages/${payload.stageId}`,
      payload.data
    );
    return response.data;
  }
);

export const reorderOpportunityStages = createAsyncThunk(
  'opportunities/reorderOpportunityStages',
  async (stageIds: string[]) => {
    const response = await api.post<OpportunityStage[]>('/opportunities/stages/reorder', {
      stage_ids: stageIds,
    });
    return response.data;
  }
);

export const fetchOpportunities = createAsyncThunk(
  'opportunities/fetchOpportunities',
  async (filters?: OpportunityFilters) => {
    const response = await api.get<{ data: Opportunity[]; pagination: OpportunityPagination }>(
      `/opportunities${buildQueryString(filters)}`
    );
    return response.data;
  }
);

export const fetchOpportunitySummary = createAsyncThunk(
  'opportunities/fetchOpportunitySummary',
  async () => {
    const response = await api.get<OpportunitySummary>('/opportunities/summary');
    return response.data;
  }
);

export const createOpportunity = createAsyncThunk(
  'opportunities/createOpportunity',
  async (payload: CreateOpportunityDTO) => {
    const response = await api.post<Opportunity>('/opportunities', payload);
    return response.data;
  }
);

export const updateOpportunity = createAsyncThunk(
  'opportunities/updateOpportunity',
  async (payload: { opportunityId: string; data: UpdateOpportunityDTO }) => {
    const response = await api.put<Opportunity>(`/opportunities/${payload.opportunityId}`, payload.data);
    return response.data;
  }
);

export const moveOpportunityStage = createAsyncThunk(
  'opportunities/moveOpportunityStage',
  async (payload: { opportunityId: string; stageId: string; notes?: string }) => {
    const response = await api.post<Opportunity>(
      `/opportunities/${payload.opportunityId}/move-stage`,
      {
        stage_id: payload.stageId,
        notes: payload.notes,
      }
    );

    return response.data;
  }
);

export const deleteOpportunity = createAsyncThunk(
  'opportunities/deleteOpportunity',
  async (opportunityId: string) => {
    await api.delete(`/opportunities/${opportunityId}`);
    return opportunityId;
  }
);

const opportunitiesSlice = createSlice({
  name: 'opportunities',
  initialState,
  reducers: {
    clearOpportunitiesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOpportunityStages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpportunityStages.fulfilled, (state, action) => {
        state.loading = false;
        state.stages = action.payload;
      })
      .addCase(fetchOpportunityStages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch opportunity stages';
      })
      .addCase(createOpportunityStage.fulfilled, (state, action) => {
        state.stages = [...state.stages, action.payload].sort((a, b) => a.stage_order - b.stage_order);
      })
      .addCase(updateOpportunityStage.fulfilled, (state, action) => {
        const index = state.stages.findIndex((stage) => stage.id === action.payload.id);
        if (index !== -1) {
          state.stages[index] = action.payload;
          state.stages.sort((a, b) => a.stage_order - b.stage_order);
        }
      })
      .addCase(reorderOpportunityStages.fulfilled, (state, action) => {
        state.stages = action.payload;
      })
      .addCase(fetchOpportunities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpportunities.fulfilled, (state, action) => {
        state.loading = false;
        state.opportunities = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchOpportunities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch opportunities';
      })
      .addCase(fetchOpportunitySummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      .addCase(createOpportunity.fulfilled, (state, action) => {
        state.opportunities = upsertOpportunity(state.opportunities, action.payload);
      })
      .addCase(updateOpportunity.fulfilled, (state, action) => {
        state.opportunities = upsertOpportunity(state.opportunities, action.payload);
      })
      .addCase(moveOpportunityStage.fulfilled, (state, action) => {
        state.opportunities = upsertOpportunity(state.opportunities, action.payload);
      })
      .addCase(deleteOpportunity.fulfilled, (state, action) => {
        state.opportunities = state.opportunities.filter((opportunity) => opportunity.id !== action.payload);
      });
  },
});

export const { clearOpportunitiesError } = opportunitiesSlice.actions;

export default opportunitiesSlice.reducer;
