import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { casesApiClient } from '../api/casesApiClient';
import type {
  CaseMilestone,
  CreateCaseMilestoneDTO,
  UpdateCaseMilestoneDTO,
  CaseRelationship,
  CreateCaseRelationshipDTO,
  CaseService,
  CreateCaseServiceDTO,
  UpdateCaseServiceDTO,
} from '../../../types/case';

export interface CaseManagementState {
  milestones: CaseMilestone[];
  relationships: CaseRelationship[];
  services: CaseService[];
  loading: boolean;
  error: string | null;
}

const initialState: CaseManagementState = {
  milestones: [],
  relationships: [],
  services: [],
  loading: false,
  error: null,
};

// Milestones
export const fetchCaseMilestones = createAsyncThunk(
  'caseManagement/fetchMilestones',
  async (caseId: string) => {
    return await casesApiClient.listCaseMilestones(caseId);
  }
);

export const createCaseMilestone = createAsyncThunk(
  'caseManagement/createMilestone',
  async ({ caseId, data }: { caseId: string; data: CreateCaseMilestoneDTO }) => {
    return await casesApiClient.createCaseMilestone(caseId, data);
  }
);

export const updateCaseMilestone = createAsyncThunk(
  'caseManagement/updateMilestone',
  async ({ milestoneId, data }: { milestoneId: string; data: UpdateCaseMilestoneDTO }) => {
    return await casesApiClient.updateCaseMilestone(milestoneId, data);
  }
);

export const deleteCaseMilestone = createAsyncThunk(
  'caseManagement/deleteMilestone',
  async (milestoneId: string) => {
    await casesApiClient.deleteCaseMilestone(milestoneId);
    return milestoneId;
  }
);

// Relationships
export const fetchCaseRelationships = createAsyncThunk(
  'caseManagement/fetchRelationships',
  async (caseId: string) => {
    return await casesApiClient.listCaseRelationships(caseId);
  }
);

export const createCaseRelationship = createAsyncThunk(
  'caseManagement/createRelationship',
  async ({ caseId, data }: { caseId: string; data: CreateCaseRelationshipDTO }) => {
    return await casesApiClient.createCaseRelationship(caseId, data);
  }
);

export const deleteCaseRelationship = createAsyncThunk(
  'caseManagement/deleteRelationship',
  async (relationshipId: string) => {
    await casesApiClient.deleteCaseRelationship(relationshipId);
    return relationshipId;
  }
);

// Services
export const fetchCaseServices = createAsyncThunk(
  'caseManagement/fetchServices',
  async (caseId: string) => {
    return await casesApiClient.listCaseServices(caseId);
  }
);

export const createCaseService = createAsyncThunk(
  'caseManagement/createService',
  async ({ caseId, data }: { caseId: string; data: CreateCaseServiceDTO }) => {
    return await casesApiClient.createCaseService(caseId, data);
  }
);

export const updateCaseService = createAsyncThunk(
  'caseManagement/updateService',
  async ({ serviceId, data }: { serviceId: string; data: UpdateCaseServiceDTO }) => {
    return await casesApiClient.updateCaseService(serviceId, data);
  }
);

export const deleteCaseService = createAsyncThunk(
  'caseManagement/deleteService',
  async (serviceId: string) => {
    await casesApiClient.deleteCaseService(serviceId);
    return serviceId;
  }
);

const caseManagementSlice = createSlice({
  name: 'caseManagement',
  initialState,
  reducers: {
    resetManagement: (state) => {
      state.milestones = [];
      state.relationships = [];
      state.services = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCaseMilestones.fulfilled, (state, action) => {
        state.milestones = action.payload;
      })
      .addCase(createCaseMilestone.fulfilled, (state, action) => {
        state.milestones.push(action.payload);
      })
      .addCase(updateCaseMilestone.fulfilled, (state, action) => {
        const idx = state.milestones.findIndex(m => m.id === action.payload.id);
        if (idx !== -1) state.milestones[idx] = action.payload;
      })
      .addCase(deleteCaseMilestone.fulfilled, (state, action) => {
        state.milestones = state.milestones.filter(m => m.id !== action.payload);
      })
      .addCase(fetchCaseRelationships.fulfilled, (state, action) => {
        state.relationships = action.payload;
      })
      .addCase(createCaseRelationship.fulfilled, (state, action) => {
        state.relationships.unshift(action.payload);
      })
      .addCase(deleteCaseRelationship.fulfilled, (state, action) => {
        state.relationships = state.relationships.filter(r => r.id !== action.payload);
      })
      .addCase(fetchCaseServices.fulfilled, (state, action) => {
        state.services = action.payload;
      })
      .addCase(createCaseService.fulfilled, (state, action) => {
        state.services.unshift(action.payload);
      })
      .addCase(updateCaseService.fulfilled, (state, action) => {
        const idx = state.services.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) state.services[idx] = action.payload;
      })
      .addCase(deleteCaseService.fulfilled, (state, action) => {
        state.services = state.services.filter(s => s.id !== action.payload);
      });
  },
});

export const { resetManagement } = caseManagementSlice.actions;
export default caseManagementSlice.reducer;
