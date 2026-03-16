import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../../services/api';
import type {
  RecurringDonationManagementLinkResponse,
  RecurringDonationPlan,
  RecurringDonationPlanFilters,
  RecurringDonationPlanListPage,
  UpdateRecurringDonationPlanDTO,
} from '../../../types/recurringDonation';
import { buildQueryParams, handlePending, handleRejected } from '../../../store/sliceHelpers';

interface RecurringDonationsState {
  plans: RecurringDonationPlan[];
  selectedPlan: RecurringDonationPlan | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: RecurringDonationsState = {
  plans: [],
  selectedPlan: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  loading: false,
  error: null,
};

export const fetchRecurringDonationPlans = createAsyncThunk(
  'recurringDonations/fetchRecurringDonationPlans',
  async (params: {
    filters?: RecurringDonationPlanFilters;
    pagination?: { page?: number; limit?: number };
  }) => {
    const queryParams = buildQueryParams(
      params.filters as Record<string, unknown> | undefined,
      params.pagination as Record<string, unknown> | undefined
    );
    const response = await api.get<RecurringDonationPlanListPage>(
      `/recurring-donations?${queryParams.toString()}`
    );
    return response.data;
  }
);

export const fetchRecurringDonationPlanById = createAsyncThunk(
  'recurringDonations/fetchRecurringDonationPlanById',
  async (planId: string) => {
    const response = await api.get<RecurringDonationPlan>(`/recurring-donations/${planId}`);
    return response.data;
  }
);

export const updateRecurringDonationPlan = createAsyncThunk(
  'recurringDonations/updateRecurringDonationPlan',
  async ({
    planId,
    planData,
  }: {
    planId: string;
    planData: UpdateRecurringDonationPlanDTO;
  }) => {
    const response = await api.put<RecurringDonationPlan>(
      `/recurring-donations/${planId}`,
      planData
    );
    return response.data;
  }
);

export const cancelRecurringDonationPlan = createAsyncThunk(
  'recurringDonations/cancelRecurringDonationPlan',
  async (planId: string) => {
    const response = await api.post<RecurringDonationPlan>(
      `/recurring-donations/${planId}/cancel`
    );
    return response.data;
  }
);

export const reactivateRecurringDonationPlan = createAsyncThunk(
  'recurringDonations/reactivateRecurringDonationPlan',
  async (planId: string) => {
    const response = await api.post<RecurringDonationPlan>(
      `/recurring-donations/${planId}/reactivate`
    );
    return response.data;
  }
);

export const generateRecurringDonationManagementLink = createAsyncThunk(
  'recurringDonations/generateRecurringDonationManagementLink',
  async (planId: string) => {
    const response = await api.post<RecurringDonationManagementLinkResponse>(
      `/recurring-donations/${planId}/management-link`
    );
    return response.data;
  }
);

const applyUpdatedPlan = (
  state: RecurringDonationsState,
  plan: RecurringDonationPlan
): void => {
  const index = state.plans.findIndex(
    (current) => current.recurring_plan_id === plan.recurring_plan_id
  );
  if (index !== -1) {
    state.plans[index] = plan;
  }

  if (state.selectedPlan?.recurring_plan_id === plan.recurring_plan_id) {
    state.selectedPlan = plan;
  }
};

const recurringDonationsSlice = createSlice({
  name: 'recurringDonations',
  initialState,
  reducers: {
    clearSelectedRecurringDonation: (state) => {
      state.selectedPlan = null;
    },
    clearRecurringDonationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchRecurringDonationPlans.pending, handlePending);
    builder.addCase(
      fetchRecurringDonationPlans.fulfilled,
      (state, action: PayloadAction<RecurringDonationPlanListPage>) => {
        state.loading = false;
        state.plans = action.payload.data;
        state.pagination = action.payload.pagination;
      }
    );
    builder.addCase(fetchRecurringDonationPlans.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to fetch recurring donation plans');
    });

    builder.addCase(fetchRecurringDonationPlanById.pending, handlePending);
    builder.addCase(
      fetchRecurringDonationPlanById.fulfilled,
      (state, action: PayloadAction<RecurringDonationPlan>) => {
        state.loading = false;
        state.selectedPlan = action.payload;
      }
    );
    builder.addCase(fetchRecurringDonationPlanById.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to fetch recurring donation plan');
    });

    builder.addCase(updateRecurringDonationPlan.pending, handlePending);
    builder.addCase(
      updateRecurringDonationPlan.fulfilled,
      (state, action: PayloadAction<RecurringDonationPlan>) => {
        state.loading = false;
        applyUpdatedPlan(state, action.payload);
      }
    );
    builder.addCase(updateRecurringDonationPlan.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to update recurring donation plan');
    });

    builder.addCase(cancelRecurringDonationPlan.pending, handlePending);
    builder.addCase(
      cancelRecurringDonationPlan.fulfilled,
      (state, action: PayloadAction<RecurringDonationPlan>) => {
        state.loading = false;
        applyUpdatedPlan(state, action.payload);
      }
    );
    builder.addCase(cancelRecurringDonationPlan.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to cancel recurring donation plan');
    });

    builder.addCase(reactivateRecurringDonationPlan.pending, handlePending);
    builder.addCase(
      reactivateRecurringDonationPlan.fulfilled,
      (state, action: PayloadAction<RecurringDonationPlan>) => {
        state.loading = false;
        applyUpdatedPlan(state, action.payload);
      }
    );
    builder.addCase(reactivateRecurringDonationPlan.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to reactivate recurring donation plan');
    });

    builder.addCase(generateRecurringDonationManagementLink.pending, handlePending);
    builder.addCase(generateRecurringDonationManagementLink.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(generateRecurringDonationManagementLink.rejected, (state, action) => {
      handleRejected(state, action, 'Failed to generate recurring donation management link');
    });
  },
});

export const { clearSelectedRecurringDonation, clearRecurringDonationError } =
  recurringDonationsSlice.actions;
export default recurringDonationsSlice.reducer;
