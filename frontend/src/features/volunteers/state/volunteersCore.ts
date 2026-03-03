import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { volunteersApiClient } from '../api/volunteersApiClient';
import type {
  AssignmentMutationInput,
  Volunteer,
  VolunteerAssignment,
  VolunteerMutationInput,
  VolunteersListQuery,
} from '../types/contracts';

export type { Volunteer, VolunteerAssignment };

export interface VolunteersState {
  volunteers: Volunteer[];
  currentVolunteer: Volunteer | null;
  assignments: VolunteerAssignment[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  filters: {
    search: string;
    skills: string[];
    availability_status: string;
    background_check_status: string;
    is_active: boolean;
  };
}

const initialState: VolunteersState = {
  volunteers: [],
  currentVolunteer: null,
  assignments: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  filters: {
    search: '',
    skills: [],
    availability_status: '',
    background_check_status: '',
    is_active: true,
  },
};

export const fetchVolunteers = createAsyncThunk(
  'volunteers/fetchVolunteers',
  async (params: VolunteersListQuery = {}) => {
    return volunteersApiClient.listVolunteers(params);
  }
);

export const fetchVolunteerById = createAsyncThunk(
  'volunteers/fetchVolunteerById',
  async (volunteerId: string) => {
    return volunteersApiClient.getVolunteerById(volunteerId);
  }
);

export const fetchVolunteersBySkills = createAsyncThunk(
  'volunteers/fetchVolunteersBySkills',
  async (skills: string[]) => {
    return volunteersApiClient.findVolunteersBySkills(skills);
  }
);

export const createVolunteer = createAsyncThunk(
  'volunteers/createVolunteer',
  async (volunteerData: VolunteerMutationInput) => {
    return volunteersApiClient.createVolunteer(volunteerData);
  }
);

export const updateVolunteer = createAsyncThunk(
  'volunteers/updateVolunteer',
  async ({ volunteerId, data }: { volunteerId: string; data: VolunteerMutationInput }) => {
    return volunteersApiClient.updateVolunteer(volunteerId, data);
  }
);

export const deleteVolunteer = createAsyncThunk(
  'volunteers/deleteVolunteer',
  async (volunteerId: string) => {
    await volunteersApiClient.deleteVolunteer(volunteerId);
    return volunteerId;
  }
);

export const fetchVolunteerAssignments = createAsyncThunk(
  'volunteers/fetchAssignments',
  async (volunteerId: string) => {
    return volunteersApiClient.listAssignments(volunteerId);
  }
);

export const createAssignment = createAsyncThunk(
  'volunteers/createAssignment',
  async (assignmentData: AssignmentMutationInput) => {
    return volunteersApiClient.createAssignment(assignmentData);
  }
);

export const updateAssignment = createAsyncThunk(
  'volunteers/updateAssignment',
  async ({ assignmentId, data }: { assignmentId: string; data: AssignmentMutationInput }) => {
    return volunteersApiClient.updateAssignment(assignmentId, data);
  }
);

const volunteersSlice = createSlice({
  name: 'volunteers',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<VolunteersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentVolunteer: (state) => {
      state.currentVolunteer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVolunteers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVolunteers.fulfilled, (state, action) => {
        state.loading = false;
        state.volunteers = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVolunteers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch volunteers';
      })
      .addCase(fetchVolunteerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVolunteerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVolunteer = action.payload;
      })
      .addCase(fetchVolunteerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch volunteer';
      })
      .addCase(fetchVolunteersBySkills.fulfilled, (state, action) => {
        state.volunteers = action.payload;
      })
      .addCase(createVolunteer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVolunteer.fulfilled, (state, action) => {
        state.loading = false;
        state.volunteers.unshift(action.payload);
      })
      .addCase(createVolunteer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create volunteer';
      })
      .addCase(updateVolunteer.fulfilled, (state, action) => {
        const index = state.volunteers.findIndex((v) => v.volunteer_id === action.payload.volunteer_id);
        if (index !== -1) {
          state.volunteers[index] = action.payload;
        }
        if (state.currentVolunteer?.volunteer_id === action.payload.volunteer_id) {
          state.currentVolunteer = action.payload;
        }
      })
      .addCase(deleteVolunteer.fulfilled, (state, action) => {
        state.volunteers = state.volunteers.filter((v) => v.volunteer_id !== action.payload);
      })
      .addCase(fetchVolunteerAssignments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVolunteerAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload;
      })
      .addCase(fetchVolunteerAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch assignments';
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.assignments.unshift(action.payload);
      })
      .addCase(updateAssignment.fulfilled, (state, action) => {
        const index = state.assignments.findIndex((a) => a.assignment_id === action.payload.assignment_id);
        if (index !== -1) {
          state.assignments[index] = action.payload;
        }
      });
  },
});

export const { setFilters, clearFilters, clearCurrentVolunteer, clearError } = volunteersSlice.actions;
export default volunteersSlice.reducer;
