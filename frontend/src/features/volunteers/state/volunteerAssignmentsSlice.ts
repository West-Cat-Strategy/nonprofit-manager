import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { volunteersApiClient } from '../api/volunteersApiClient';
import type {
  VolunteerAssignment,
  AssignmentMutationInput,
} from '../types/contracts';

export interface VolunteerAssignmentsState {
  assignments: VolunteerAssignment[];
  loading: boolean;
  error: string | null;
}

const initialState: VolunteerAssignmentsState = {
  assignments: [],
  loading: false,
  error: null,
};

export const fetchVolunteerAssignments = createAsyncThunk(
  'volunteerAssignments/fetchAssignments',
  async (volunteerId: string) => {
    return volunteersApiClient.listAssignments(volunteerId);
  }
);

export const createAssignment = createAsyncThunk(
  'volunteerAssignments/createAssignment',
  async (assignmentData: AssignmentMutationInput) => {
    return volunteersApiClient.createAssignment(assignmentData);
  }
);

export const updateAssignment = createAsyncThunk(
  'volunteerAssignments/updateAssignment',
  async ({ assignmentId, data }: { assignmentId: string; data: AssignmentMutationInput }) => {
    return volunteersApiClient.updateAssignment(assignmentId, data);
  }
);

const volunteerAssignmentsSlice = createSlice({
  name: 'volunteerAssignments',
  initialState,
  reducers: {
    clearAssignments: (state) => {
      state.assignments = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVolunteerAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
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

export const { clearAssignments } = volunteerAssignmentsSlice.actions;
export default volunteerAssignmentsSlice.reducer;
