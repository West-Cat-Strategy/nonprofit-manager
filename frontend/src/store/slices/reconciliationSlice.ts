/**
 * Reconciliation Slice
 * Redux state management for payment reconciliation
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { formatApiErrorMessageWith } from '../../utils/apiError';
import type {
  PaymentReconciliation,
  ReconciliationItem,
  PaymentDiscrepancy,
  ReconciliationDetail,
  ReconciliationDashboardStats,
  CreateReconciliationRequest,
  MatchTransactionRequest,
  ResolveDiscrepancyRequest,
  AssignDiscrepancyRequest,
} from '../../types/reconciliation';

const getErrorMessage = (error: unknown, fallbackMessage: string) => formatApiErrorMessageWith(fallbackMessage)(error);

interface ReconciliationState {
  // Dashboard
  dashboardStats: ReconciliationDashboardStats | null;
  latestReconciliation: PaymentReconciliation | null;

  // Reconciliations list
  reconciliations: PaymentReconciliation[];
  reconc_pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };

  // Current reconciliation detail
  currentReconciliation: ReconciliationDetail | null;
  reconciliationItems: ReconciliationItem[];
  items_pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };

  // Discrepancies
  discrepancies: PaymentDiscrepancy[];
  disc_pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };

  // UI State
  loading: boolean;
  creating: boolean;
  error: string | null;
}

const initialState: ReconciliationState = {
  dashboardStats: null,
  latestReconciliation: null,
  reconciliations: [],
  reconc_pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  currentReconciliation: null,
  reconciliationItems: [],
  items_pagination: {
    total: 0,
    page: 1,
    limit: 50,
    total_pages: 0,
  },
  discrepancies: [],
  disc_pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  loading: false,
  creating: false,
  error: null,
};

/**
 * Fetch dashboard statistics
 */
export const fetchReconciliationDashboard = createAsyncThunk(
  'reconciliation/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/reconciliation/dashboard');
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch reconciliation dashboard');
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new reconciliation
 */
export const createReconciliation = createAsyncThunk<PaymentReconciliation, CreateReconciliationRequest>(
  'reconciliation/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/reconciliation', data);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create reconciliation');
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch reconciliations with filters
 */
export const fetchReconciliations = createAsyncThunk(
  'reconciliation/fetchAll',
  async (params: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/reconciliation', { params });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch reconciliations');
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch reconciliation by ID
 */
export const fetchReconciliationById = createAsyncThunk<ReconciliationDetail, string>(
  'reconciliation/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reconciliation/${id}`);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch reconciliation');
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch reconciliation items
 */
export const fetchReconciliationItems = createAsyncThunk(
  'reconciliation/fetchItems',
  async (
    { id, params = {} }: { id: string; params?: Record<string, unknown> },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.get(`/reconciliation/${id}/items`, { params });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch reconciliation items');
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch discrepancies for a reconciliation
 */
export const fetchReconciliationDiscrepancies = createAsyncThunk(
  'reconciliation/fetchDiscrepancies',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reconciliation/${id}/discrepancies`);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch discrepancies');
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch all discrepancies with filters
 */
export const fetchAllDiscrepancies = createAsyncThunk(
  'reconciliation/fetchAllDiscrepancies',
  async (params: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/reconciliation/discrepancies/all', { params });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch discrepancies');
      return rejectWithValue(message);
    }
  }
);

/**
 * Manually match a transaction
 */
export const manualMatchTransaction = createAsyncThunk<void, MatchTransactionRequest>(
  'reconciliation/manualMatch',
  async (data, { rejectWithValue }) => {
    try {
      await api.post('/reconciliation/match', data);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to match transaction');
      return rejectWithValue(message);
    }
  }
);

/**
 * Resolve a discrepancy
 */
export const resolveDiscrepancy = createAsyncThunk(
  'reconciliation/resolveDiscrepancy',
  async ({ id, data }: { id: string; data: ResolveDiscrepancyRequest }, { rejectWithValue }) => {
    try {
      await api.put(`/reconciliation/discrepancies/${id}/resolve`, data);
      return id;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to resolve discrepancy');
      return rejectWithValue(message);
    }
  }
);

/**
 * Assign a discrepancy
 */
export const assignDiscrepancy = createAsyncThunk(
  'reconciliation/assignDiscrepancy',
  async ({ id, data }: { id: string; data: AssignDiscrepancyRequest }, { rejectWithValue }) => {
    try {
      await api.put(`/reconciliation/discrepancies/${id}/assign`, data);
      return id;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to assign discrepancy');
      return rejectWithValue(message);
    }
  }
);

const reconciliationSlice = createSlice({
  name: 'reconciliation',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentReconciliation: (state) => {
      state.currentReconciliation = null;
      state.reconciliationItems = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch dashboard
    builder.addCase(fetchReconciliationDashboard.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchReconciliationDashboard.fulfilled, (state, action) => {
      state.loading = false;
      state.dashboardStats = action.payload.stats;
      state.latestReconciliation = action.payload.latest_reconciliation;
    });
    builder.addCase(fetchReconciliationDashboard.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create reconciliation
    builder.addCase(createReconciliation.pending, (state) => {
      state.creating = true;
      state.error = null;
    });
    builder.addCase(createReconciliation.fulfilled, (state, action) => {
      state.creating = false;
      state.reconciliations.unshift(action.payload);
      state.latestReconciliation = action.payload;
    });
    builder.addCase(createReconciliation.rejected, (state, action) => {
      state.creating = false;
      state.error = action.payload as string;
    });

    // Fetch reconciliations
    builder.addCase(fetchReconciliations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchReconciliations.fulfilled, (state, action) => {
      state.loading = false;
      state.reconciliations = action.payload.reconciliations;
      state.reconc_pagination = action.payload.pagination;
    });
    builder.addCase(fetchReconciliations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch reconciliation by ID
    builder.addCase(fetchReconciliationById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchReconciliationById.fulfilled, (state, action) => {
      state.loading = false;
      state.currentReconciliation = action.payload;
    });
    builder.addCase(fetchReconciliationById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch reconciliation items
    builder.addCase(fetchReconciliationItems.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchReconciliationItems.fulfilled, (state, action) => {
      state.loading = false;
      state.reconciliationItems = action.payload.items;
      state.items_pagination = action.payload.pagination;
    });
    builder.addCase(fetchReconciliationItems.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch discrepancies
    builder.addCase(fetchReconciliationDiscrepancies.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchReconciliationDiscrepancies.fulfilled, (state, action) => {
      state.loading = false;
      state.discrepancies = action.payload.discrepancies;
    });
    builder.addCase(fetchReconciliationDiscrepancies.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch all discrepancies
    builder.addCase(fetchAllDiscrepancies.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAllDiscrepancies.fulfilled, (state, action) => {
      state.loading = false;
      state.discrepancies = action.payload.discrepancies;
      state.disc_pagination = action.payload.pagination;
    });
    builder.addCase(fetchAllDiscrepancies.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Resolve discrepancy
    builder.addCase(resolveDiscrepancy.fulfilled, (state, action) => {
      const id = action.payload;
      const index = state.discrepancies.findIndex((d) => d.id === id);
      if (index !== -1) {
        state.discrepancies[index].status = 'resolved';
      }
    });
  },
});

export const { clearError, clearCurrentReconciliation } = reconciliationSlice.actions;
export default reconciliationSlice.reducer;
