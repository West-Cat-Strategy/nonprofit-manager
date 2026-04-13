import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { volunteersApiClient } from '../api/volunteersApiClient';
import type {
  Volunteer,
  VolunteerMutationInput,
} from '../types/contracts';

export interface VolunteersCoreState {
  currentVolunteer: Volunteer | null;
  loading: boolean;
  error: string | null;
}

const initialState: VolunteersCoreState = {
  currentVolunteer: null,
  loading: false,
  error: null,
};

export const fetchVolunteerById = createAsyncThunk(
  'volunteersCore/fetchVolunteerById',
  async (volunteerId: string) => {
    return volunteersApiClient.getVolunteerById(volunteerId);
  }
);

export const createVolunteer = createAsyncThunk(
  'volunteersCore/createVolunteer',
  async (volunteerData: VolunteerMutationInput) => {
    return volunteersApiClient.createVolunteer(volunteerData);
  }
);

export const updateVolunteer = createAsyncThunk(
  'volunteersCore/updateVolunteer',
  async ({ volunteerId, data }: { volunteerId: string; data: VolunteerMutationInput }) => {
    return volunteersApiClient.updateVolunteer(volunteerId, data);
  }
);

export const deleteVolunteer = createAsyncThunk(
  'volunteersCore/deleteVolunteer',
  async (volunteerId: string) => {
    await volunteersApiClient.deleteVolunteer(volunteerId);
    return volunteerId;
  }
);

const volunteersCoreSlice = createSlice({
  name: 'volunteersCore',
  initialState,
  reducers: {
    clearCurrentVolunteer: (state) => {
      state.currentVolunteer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(createVolunteer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createVolunteer.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createVolunteer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create volunteer';
      })
      .addCase(updateVolunteer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateVolunteer.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentVolunteer?.volunteer_id === action.payload.volunteer_id) {
          state.currentVolunteer = action.payload;
        }
      })
      .addCase(updateVolunteer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update volunteer';
      })
      .addCase(deleteVolunteer.fulfilled, (state, action) => {
        if (state.currentVolunteer?.volunteer_id === action.payload) {
          state.currentVolunteer = null;
        }
      });
  },
});

export const { clearCurrentVolunteer, clearError } = volunteersCoreSlice.actions;
export default volunteersCoreSlice.reducer;
