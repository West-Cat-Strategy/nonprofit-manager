/**
 * Alerts Redux Slice
 * State management for analytics alert configuration
 */

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { alertsApiClient } from '../api/alertsApiClient';
import type {
  AlertConfig,
  AlertInstance,
  AlertStats,
  CreateAlertDTO,
  UpdateAlertDTO,
  AlertInstanceFilters,
} from '../types';

interface AlertsState {
  configs: AlertConfig[];
  currentConfig: AlertConfig | null;
  instances: AlertInstance[];
  stats: AlertStats | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: AlertsState = {
  configs: [],
  currentConfig: null,
  instances: [],
  stats: null,
  loading: false,
  saving: false,
  error: null,
};

/**
 * Fetch all alert configurations
 */
export const fetchAlertConfigs = createAsyncThunk(
  'alerts/fetchConfigs',
  async () => alertsApiClient.fetchAlertConfigs()
);

/**
 * Fetch a specific alert configuration
 */
export const fetchAlertConfig = createAsyncThunk(
  'alerts/fetchConfig',
  async (id: string) => alertsApiClient.fetchAlertConfig(id)
);

/**
 * Create new alert configuration
 */
export const createAlertConfig = createAsyncThunk(
  'alerts/createConfig',
  async (config: CreateAlertDTO) => alertsApiClient.createAlertConfig(config)
);

/**
 * Update alert configuration
 */
export const updateAlertConfig = createAsyncThunk(
  'alerts/updateConfig',
  async ({ id, config }: { id: string; config: UpdateAlertDTO }) =>
    alertsApiClient.updateAlertConfig(id, config)
);

/**
 * Delete alert configuration
 */
export const deleteAlertConfig = createAsyncThunk(
  'alerts/deleteConfig',
  async (id: string) => {
    await alertsApiClient.deleteAlertConfig(id);
    return id;
  }
);

/**
 * Toggle alert enabled status
 */
export const toggleAlertConfig = createAsyncThunk(
  'alerts/toggleConfig',
  async (id: string) => alertsApiClient.toggleAlertConfig(id)
);

/**
 * Test alert configuration
 */
export const testAlertConfig = createAsyncThunk(
  'alerts/testConfig',
  async (config: CreateAlertDTO) => alertsApiClient.testAlertConfig(config)
);

/**
 * Fetch alert instances (triggered alerts)
 */
export const fetchAlertInstances = createAsyncThunk(
  'alerts/fetchInstances',
  async (filters?: AlertInstanceFilters) => alertsApiClient.fetchAlertInstances(filters)
);

/**
 * Acknowledge alert instance
 */
export const acknowledgeAlert = createAsyncThunk(
  'alerts/acknowledge',
  async (id: string) => alertsApiClient.acknowledgeAlert(id)
);

/**
 * Resolve alert instance
 */
export const resolveAlert = createAsyncThunk(
  'alerts/resolve',
  async (id: string) => alertsApiClient.resolveAlert(id)
);

/**
 * Fetch alert statistics
 */
export const fetchAlertStats = createAsyncThunk(
  'alerts/fetchStats',
  async () => alertsApiClient.fetchAlertStats()
);

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConfig: (state, action: PayloadAction<AlertConfig | null>) => {
      state.currentConfig = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch alert configs
      .addCase(fetchAlertConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload;
      })
      .addCase(fetchAlertConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert configurations';
      })

      // Fetch single config
      .addCase(fetchAlertConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConfig = action.payload;
      })
      .addCase(fetchAlertConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert configuration';
      })

      // Create config
      .addCase(createAlertConfig.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createAlertConfig.fulfilled, (state, action) => {
        state.saving = false;
        state.configs.push(action.payload);
        state.currentConfig = action.payload;
      })
      .addCase(createAlertConfig.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to create alert configuration';
      })

      // Update config
      .addCase(updateAlertConfig.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAlertConfig.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.configs.findIndex((c: AlertConfig) => c.id === action.payload.id);
        if (index !== -1) {
          state.configs[index] = action.payload;
        }
        if (state.currentConfig?.id === action.payload.id) {
          state.currentConfig = action.payload;
        }
      })
      .addCase(updateAlertConfig.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to update alert configuration';
      })

      // Delete config
      .addCase(deleteAlertConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAlertConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = state.configs.filter((c: AlertConfig) => c.id !== action.payload);
        if (state.currentConfig?.id === action.payload) {
          state.currentConfig = null;
        }
      })
      .addCase(deleteAlertConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete alert configuration';
      })

      // Toggle config
      .addCase(toggleAlertConfig.fulfilled, (state, action) => {
        const index = state.configs.findIndex((c: AlertConfig) => c.id === action.payload.id);
        if (index !== -1) {
          state.configs[index] = action.payload;
        }
        if (state.currentConfig?.id === action.payload.id) {
          state.currentConfig = action.payload;
        }
      })

      // Fetch instances
      .addCase(fetchAlertInstances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertInstances.fulfilled, (state, action) => {
        state.loading = false;
        state.instances = action.payload;
      })
      .addCase(fetchAlertInstances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch alert instances';
      })

      // Acknowledge alert
      .addCase(acknowledgeAlert.fulfilled, (state, action) => {
        const index = state.instances.findIndex((i: AlertInstance) => i.id === action.payload.id);
        if (index !== -1) {
          state.instances[index] = action.payload;
        }
      })

      // Resolve alert
      .addCase(resolveAlert.fulfilled, (state, action) => {
        const index = state.instances.findIndex((i: AlertInstance) => i.id === action.payload.id);
        if (index !== -1) {
          state.instances[index] = action.payload;
        }
      })

      // Fetch stats
      .addCase(fetchAlertStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearError, setCurrentConfig } = alertsSlice.actions;

export default alertsSlice.reducer;
